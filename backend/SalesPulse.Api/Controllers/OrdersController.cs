using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesPulse.Api.Data;
using SalesPulse.Api.Dtos;
using SalesPulse.Api.Models;

namespace SalesPulse.Api.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<PagedResult<OrderListItem>> List(
        [FromQuery] string? search, [FromQuery] OrderStatus? status,
        [FromQuery] string sortBy = "date", [FromQuery] bool desc = true,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 15)
    {
        pageSize = Math.Clamp(pageSize, 5, 100);
        var q = db.Orders.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(o => o.OrderNumber.Contains(search) || o.Customer.Name.Contains(search) || o.Customer.Company.Contains(search));
        if (status is not null)
            q = q.Where(o => o.Status == status);

        q = (sortBy.ToLower(), desc) switch
        {
            ("total", true) => q.OrderByDescending(o => o.Total),
            ("total", false) => q.OrderBy(o => o.Total),
            ("customer", true) => q.OrderByDescending(o => o.Customer.Name),
            ("customer", false) => q.OrderBy(o => o.Customer.Name),
            (_, false) => q.OrderBy(o => o.OrderDate),
            _ => q.OrderByDescending(o => o.OrderDate),
        };

        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(o => new OrderListItem(o.Id, o.OrderNumber, o.Customer.Name, o.Customer.Region,
                o.OrderDate, o.Status.ToString(), o.Items.Count, o.Total))
            .ToListAsync();

        return new PagedResult<OrderListItem>(items, total, page, pageSize);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDetail>> Get(int id)
    {
        var o = await db.Orders.AsNoTracking()
            .Include(x => x.Customer).Include(x => x.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound();

        return new OrderDetail(o.Id, o.OrderNumber, o.Customer.Name, o.Customer.Email, o.Customer.Company,
            o.OrderDate, o.Status.ToString(), o.Total,
            o.Items.Select(i => new OrderLine(i.Product.Name, i.Product.Sku, i.Quantity, i.UnitPrice, i.Quantity * i.UnitPrice)).ToList());
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateStatusRequest req)
    {
        if (!Enum.TryParse<OrderStatus>(req.Status, true, out var status))
            return ValidationProblem($"Unknown status '{req.Status}'.");

        var order = await db.Orders.FindAsync(id);
        if (order is null) return NotFound();

        order.Status = status;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
