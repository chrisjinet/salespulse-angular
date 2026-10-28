using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesPulse.Api.Data;
using SalesPulse.Api.Dtos;
using SalesPulse.Api.Models;

namespace SalesPulse.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(AppDbContext db) : ControllerBase
{
    private IQueryable<Order> Valid => db.Orders.Where(o => o.Status != OrderStatus.Cancelled);

    /// <summary>Headline KPIs for the last N days, compared with the preceding N days.</summary>
    [HttpGet("summary")]
    public async Task<KpiSummary> Summary([FromQuery] int days = 30)
    {
        var now = DateTime.UtcNow;
        var start = now.AddDays(-days);
        var prevStart = start.AddDays(-days);

        var cur = await Stats(start, now);
        var prev = await Stats(prevStart, start);

        return new KpiSummary(
            cur.Revenue, Change(cur.Revenue, prev.Revenue),
            cur.Orders, Change(cur.Orders, prev.Orders),
            cur.Aov, Change(cur.Aov, prev.Aov),
            cur.Customers, Change(cur.Customers, prev.Customers));
    }

    /// <summary>Revenue/orders bucketed by day (≤90 days) or month.</summary>
    [HttpGet("trend")]
    public async Task<List<TrendPoint>> Trend([FromQuery] int days = 30)
    {
        var start = DateTime.UtcNow.Date.AddDays(-days);
        var q = Valid.Where(o => o.OrderDate >= start);

        if (days <= 90)
        {
            var daily = await q.GroupBy(o => o.OrderDate.Date)
                .Select(g => new TrendPoint(g.Key, g.Sum(o => o.Total), g.Count()))
                .ToListAsync();
            return daily.OrderBy(p => p.Period).ToList();
        }

        var monthly = await q.GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.Total), Orders = g.Count() })
            .ToListAsync();
        return monthly.Select(m => new TrendPoint(new DateTime(m.Year, m.Month, 1), m.Revenue, m.Orders))
            .OrderBy(p => p.Period).ToList();
    }

    [HttpGet("by-category")]
    public Task<List<LabelValue>> ByCategory([FromQuery] int days = 30)
    {
        var start = DateTime.UtcNow.AddDays(-days);
        return db.OrderItems
            .Where(i => i.Order.OrderDate >= start && i.Order.Status != OrderStatus.Cancelled)
            .GroupBy(i => i.Product.Category)
            .OrderByDescending(g => g.Sum(i => i.Quantity * i.UnitPrice))
            .Select(g => new LabelValue(g.Key, g.Sum(i => i.Quantity * i.UnitPrice)))
            .ToListAsync();
    }

    [HttpGet("by-region")]
    public Task<List<LabelValue>> ByRegion([FromQuery] int days = 30)
    {
        var start = DateTime.UtcNow.AddDays(-days);
        return Valid.Where(o => o.OrderDate >= start)
            .GroupBy(o => o.Customer.Region)
            .OrderByDescending(g => g.Sum(o => o.Total))
            .Select(g => new LabelValue(g.Key, g.Sum(o => o.Total)))
            .ToListAsync();
    }

    [HttpGet("top-products")]
    public Task<List<TopProduct>> TopProducts([FromQuery] int days = 30, [FromQuery] int take = 5)
    {
        var start = DateTime.UtcNow.AddDays(-days);
        return db.OrderItems
            .Where(i => i.Order.OrderDate >= start && i.Order.Status != OrderStatus.Cancelled)
            .GroupBy(i => new { i.ProductId, i.Product.Name, i.Product.Category })
            .OrderByDescending(g => g.Sum(i => i.Quantity * i.UnitPrice))
            .Take(take)
            .Select(g => new TopProduct(g.Key.ProductId, g.Key.Name, g.Key.Category,
                g.Sum(i => i.Quantity), g.Sum(i => i.Quantity * i.UnitPrice)))
            .ToListAsync();
    }

    private async Task<(decimal Revenue, int Orders, decimal Aov, int Customers)> Stats(DateTime from, DateTime to)
    {
        var q = Valid.Where(o => o.OrderDate >= from && o.OrderDate < to);
        var revenue = await q.SumAsync(o => (decimal?)o.Total) ?? 0;
        var orders = await q.CountAsync();
        var customers = await q.Select(o => o.CustomerId).Distinct().CountAsync();
        return (revenue, orders, orders == 0 ? 0 : Math.Round(revenue / orders, 2), customers);
    }

    private static decimal Change(decimal cur, decimal prev) =>
        prev == 0 ? 0 : Math.Round((cur - prev) / prev * 100, 1);
}
