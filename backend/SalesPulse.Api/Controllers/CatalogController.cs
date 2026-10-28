using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesPulse.Api.Data;
using SalesPulse.Api.Dtos;
using SalesPulse.Api.Models;

namespace SalesPulse.Api.Controllers;

[ApiController]
[Route("api")]
public class CatalogController(AppDbContext db) : ControllerBase
{
    [HttpGet("products")]
    public Task<List<ProductDto>> Products()
    {
        var since = DateTime.UtcNow.AddDays(-30);
        return db.Products.AsNoTracking()
            .OrderBy(p => p.Category).ThenBy(p => p.Name)
            .Select(p => new ProductDto(p.Id, p.Name, p.Sku, p.Category, p.Price, p.Stock, p.ReorderLevel,
                db.OrderItems.Where(i => i.ProductId == p.Id && i.Order.OrderDate >= since && i.Order.Status != OrderStatus.Cancelled)
                    .Sum(i => (int?)i.Quantity) ?? 0))
            .ToListAsync();
    }

    [HttpPut("products/{id:int}/stock")]
    public async Task<IActionResult> UpdateStock(int id, UpdateStockRequest req)
    {
        if (req.Stock < 0) return ValidationProblem("Stock cannot be negative.");
        var p = await db.Products.FindAsync(id);
        if (p is null) return NotFound();
        p.Stock = req.Stock;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("customers")]
    public Task<List<CustomerDto>> Customers([FromQuery] string? search)
    {
        var q = db.Customers.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(c => c.Name.Contains(search) || c.Company.Contains(search) || c.Email.Contains(search));

        return q.OrderByDescending(c => c.Orders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => (decimal?)o.Total) ?? 0)
            .Select(c => new CustomerDto(c.Id, c.Name, c.Email, c.Company, c.Region,
                c.Orders.Count(o => o.Status != OrderStatus.Cancelled),
                c.Orders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => (decimal?)o.Total) ?? 0,
                c.Orders.Max(o => (DateTime?)o.OrderDate)))
            .ToListAsync();
    }
}
