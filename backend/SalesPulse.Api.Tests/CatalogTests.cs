using System.Net;
using System.Net.Http.Json;
using SalesPulse.Api.Dtos;

namespace SalesPulse.Api.Tests;

[Collection(nameof(ApiCollection))]
public class CatalogTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Products_returns_full_catalog()
    {
        var products = await _client.GetFromJsonAsync<List<ProductDto>>("/api/products");

        Assert.Equal(28, products!.Count);
        Assert.Equal(products.Count, products.Select(p => p.Sku).Distinct().Count());
    }

    [Fact]
    public async Task UpdateStock_persists_new_value()
    {
        var res = await _client.PutAsJsonAsync("/api/products/5/stock", new UpdateStockRequest(123));
        var products = await _client.GetFromJsonAsync<List<ProductDto>>("/api/products");

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.Equal(123, products!.Single(p => p.Id == 5).Stock);
    }

    [Fact]
    public async Task UpdateStock_rejects_negative_values()
    {
        var res = await _client.PutAsJsonAsync("/api/products/6/stock", new UpdateStockRequest(-1));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task UpdateStock_unknown_product_returns_404()
    {
        var res = await _client.PutAsJsonAsync("/api/products/9999/stock", new UpdateStockRequest(1));
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Customers_are_ranked_by_lifetime_value()
    {
        var customers = await _client.GetFromJsonAsync<List<CustomerDto>>("/api/customers");

        Assert.Equal(80, customers!.Count);
        Assert.Equal(customers.OrderByDescending(c => c.LifetimeValue).Select(c => c.Id), customers.Select(c => c.Id));
    }

    [Fact]
    public async Task Customers_search_matches_company()
    {
        var customers = await _client.GetFromJsonAsync<List<CustomerDto>>("/api/customers?search=Hooli");

        Assert.NotEmpty(customers!);
        Assert.All(customers!, c => Assert.Equal("Hooli", c.Company));
    }
}
