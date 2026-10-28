using SalesPulse.Api.Models;

namespace SalesPulse.Api.Data;

/// <summary>Generates deterministic demo data so the dashboard looks realistic on first run.</summary>
public static class SeedData
{
    private static readonly string[] Regions = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"];
    private static readonly string[] FirstNames = ["Ava", "Liam", "Mia", "Noah", "Zoe", "Ethan", "Lily", "Lucas", "Emma", "Mason", "Chloe", "Leo", "Grace", "Owen", "Ivy", "Ryan"];
    private static readonly string[] LastNames = ["Chen", "Smith", "Patel", "Garcia", "Kim", "Nguyen", "Brown", "Lopez", "Wilson", "Khan", "Martin", "Silva"];
    private static readonly string[] Companies = ["Acme Corp", "Globex", "Initech", "Umbrella", "Stark Labs", "Wayne Ent.", "Hooli", "Vandelay", "Soylent", "Cyberdyne", "Tyrell", "Wonka Inc"];

    private static readonly (string Category, string[] Names, decimal Min, decimal Max)[] Catalog =
    [
        ("Laptops", ["UltraBook 14", "ProBook 16", "AirLite 13", "Workstation X", "GamerMax 17"], 799, 2499),
        ("Monitors", ["4K Vision 27", "CurveView 34", "OfficeView 24", "ProColor 32"], 179, 899),
        ("Accessories", ["Wireless Mouse", "Mech Keyboard", "USB-C Hub", "Webcam HD", "Laptop Stand", "Headset Pro"], 19, 199),
        ("Networking", ["Mesh Router", "Wi-Fi 7 AP", "8-Port Switch", "Firewall Mini"], 89, 649),
        ("Software", ["Office Suite", "Antivirus 1yr", "Cloud Backup", "Design Studio", "Dev Tools Pro"], 49, 399),
        ("Storage", ["NVMe 2TB", "Portable SSD 1TB", "NAS 4-Bay", "HDD 8TB"], 79, 599),
    ];

    public static void Seed(AppDbContext db)
    {
        if (db.Customers.Any()) return;

        var rng = new Random(42);
        var today = DateTime.UtcNow.Date;

        var customers = Enumerable.Range(1, 80).Select(i =>
        {
            var first = FirstNames[rng.Next(FirstNames.Length)];
            var last = LastNames[rng.Next(LastNames.Length)];
            return new Customer
            {
                Name = $"{first} {last}",
                Email = $"{first.ToLower()}.{last.ToLower()}{i}@example.com",
                Company = Companies[rng.Next(Companies.Length)],
                Region = Regions[rng.Next(Regions.Length)],
                CreatedAt = today.AddDays(-rng.Next(30, 900)),
            };
        }).ToList();

        var sku = 1000;
        var products = Catalog.SelectMany(c => c.Names.Select(n => new Product
        {
            Name = n,
            Category = c.Category,
            Sku = $"SP-{sku++}",
            Price = Math.Round(c.Min + (decimal)rng.NextDouble() * (c.Max - c.Min), 0) - 0.01m,
            Stock = rng.Next(0, 250),
            ReorderLevel = 25,
        })).ToList();

        db.Customers.AddRange(customers);
        db.Products.AddRange(products);
        db.SaveChanges();

        var orders = new List<Order>();
        for (var i = 0; i < 2400; i++)
        {
            // Skew dates toward recent days to show growth in the trend chart.
            var daysAgo = (int)(Math.Pow(rng.NextDouble(), 1.3) * 365);
            var date = DateTime.UtcNow.AddDays(-daysAgo).AddMinutes(-rng.Next(1, 12 * 60));
            var items = Enumerable.Range(0, rng.Next(1, 5)).Select(_ =>
            {
                var p = products[rng.Next(products.Count)];
                return new OrderItem { ProductId = p.Id, Quantity = rng.Next(1, 4), UnitPrice = p.Price };
            }).ToList();

            var status = daysAgo switch
            {
                < 2 => OrderStatus.Pending,
                < 5 => rng.Next(2) == 0 ? OrderStatus.Processing : OrderStatus.Shipped,
                _ => rng.Next(100) < 6 ? OrderStatus.Cancelled : OrderStatus.Delivered,
            };

            orders.Add(new Order
            {
                OrderNumber = $"ORD-{100000 + i}",
                CustomerId = customers[rng.Next(customers.Count)].Id,
                OrderDate = date,
                Status = status,
                Items = items,
                Total = items.Sum(x => x.Quantity * x.UnitPrice),
            });
        }

        db.Orders.AddRange(orders);
        db.SaveChanges();
    }
}
