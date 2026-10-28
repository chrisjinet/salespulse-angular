namespace SalesPulse.Api.Dtos;

public record KpiSummary(
    decimal Revenue, decimal RevenueChange,
    int Orders, decimal OrdersChange,
    decimal AvgOrderValue, decimal AvgOrderValueChange,
    int ActiveCustomers, decimal ActiveCustomersChange);

public record TrendPoint(DateTime Period, decimal Revenue, int Orders);
public record LabelValue(string Label, decimal Value);
public record TopProduct(int Id, string Name, string Category, int UnitsSold, decimal Revenue);

public record OrderListItem(int Id, string OrderNumber, string CustomerName, string Region, DateTime OrderDate, string Status, int ItemCount, decimal Total);
public record OrderLine(string Product, string Sku, int Quantity, decimal UnitPrice, decimal LineTotal);
public record OrderDetail(int Id, string OrderNumber, string CustomerName, string CustomerEmail, string Company, DateTime OrderDate, string Status, decimal Total, List<OrderLine> Lines);
public record PagedResult<T>(List<T> Items, int Total, int Page, int PageSize);
public record UpdateStatusRequest(string Status);

public record ProductDto(int Id, string Name, string Sku, string Category, decimal Price, int Stock, int ReorderLevel, int UnitsSold30d);
public record UpdateStockRequest(int Stock);

public record CustomerDto(int Id, string Name, string Email, string Company, string Region, int OrderCount, decimal LifetimeValue, DateTime? LastOrder);
