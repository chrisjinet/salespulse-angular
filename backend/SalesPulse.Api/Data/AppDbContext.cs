using Microsoft.EntityFrameworkCore;
using SalesPulse.Api.Models;

namespace SalesPulse.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Customer>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.Company).HasMaxLength(100);
            e.Property(x => x.Region).HasMaxLength(50);
            e.HasIndex(x => x.Email).IsUnique();
        });

        b.Entity<Product>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Sku).HasMaxLength(20);
            e.Property(x => x.Category).HasMaxLength(50);
            e.Property(x => x.Price).HasPrecision(18, 2);
            e.HasIndex(x => x.Sku).IsUnique();
        });

        b.Entity<Order>(e =>
        {
            e.Property(x => x.OrderNumber).HasMaxLength(20);
            e.Property(x => x.Total).HasPrecision(18, 2);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => x.OrderDate);
            e.HasIndex(x => x.OrderNumber).IsUnique();
        });

        b.Entity<OrderItem>(e => e.Property(x => x.UnitPrice).HasPrecision(18, 2));
    }
}
