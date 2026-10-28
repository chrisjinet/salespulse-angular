using System.Net;
using System.Net.Http.Json;
using SalesPulse.Api.Dtos;

namespace SalesPulse.Api.Tests;

[Collection(nameof(ApiCollection))]
public class OrdersTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    private Task<PagedResult<OrderListItem>?> List(string query) =>
        _client.GetFromJsonAsync<PagedResult<OrderListItem>>($"/api/orders?{query}");

    [Fact]
    public async Task List_is_paged()
    {
        var page1 = await List("pageSize=10&page=1");
        var page2 = await List("pageSize=10&page=2");

        Assert.Equal(2400, page1!.Total);
        Assert.Equal(10, page1.Items.Count);
        Assert.Empty(page1.Items.Select(o => o.Id).Intersect(page2!.Items.Select(o => o.Id)));
    }

    [Fact]
    public async Task List_filters_by_status()
    {
        var result = await List("status=Cancelled&pageSize=100");

        Assert.NotEmpty(result!.Items);
        Assert.All(result.Items, o => Assert.Equal("Cancelled", o.Status));
    }

    [Fact]
    public async Task List_searches_by_order_number()
    {
        var result = await List("search=ORD-100042");

        var order = Assert.Single(result!.Items);
        Assert.Equal("ORD-100042", order.OrderNumber);
    }

    [Fact]
    public async Task List_sorts_by_total_ascending()
    {
        var result = await List("sortBy=total&desc=false&pageSize=50");

        Assert.Equal(result!.Items.OrderBy(o => o.Total).Select(o => o.Id), result.Items.Select(o => o.Id));
    }

    [Fact]
    public async Task Get_returns_lines_that_sum_to_total()
    {
        var order = await _client.GetFromJsonAsync<OrderDetail>("/api/orders/1");

        Assert.NotNull(order);
        Assert.NotEmpty(order.Lines);
        Assert.Equal(order.Total, order.Lines.Sum(l => l.LineTotal));
    }

    [Fact]
    public async Task Get_unknown_order_returns_404()
    {
        var res = await _client.GetAsync("/api/orders/999999");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task UpdateStatus_persists_change()
    {
        var res = await _client.PatchAsJsonAsync("/api/orders/2/status", new UpdateStatusRequest("Shipped"));
        var order = await _client.GetFromJsonAsync<OrderDetail>("/api/orders/2");

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.Equal("Shipped", order!.Status);
    }

    [Fact]
    public async Task UpdateStatus_rejects_unknown_status()
    {
        var res = await _client.PatchAsJsonAsync("/api/orders/3/status", new UpdateStatusRequest("Lost"));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
