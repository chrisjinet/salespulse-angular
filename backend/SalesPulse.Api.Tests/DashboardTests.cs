using System.Net.Http.Json;
using SalesPulse.Api.Dtos;

namespace SalesPulse.Api.Tests;

[Collection(nameof(ApiCollection))]
public class DashboardTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Summary_returns_kpis_for_period()
    {
        var s = await _client.GetFromJsonAsync<KpiSummary>("/api/dashboard/summary?days=30");

        Assert.NotNull(s);
        Assert.True(s.Revenue > 0);
        Assert.True(s.Orders > 0);
        Assert.Equal(Math.Round(s.Revenue / s.Orders, 2), s.AvgOrderValue);
        Assert.InRange(s.ActiveCustomers, 1, 80);
    }

    [Fact]
    public async Task Category_breakdown_adds_up_to_summary_revenue()
    {
        var s = await _client.GetFromJsonAsync<KpiSummary>("/api/dashboard/summary?days=90");
        var categories = await _client.GetFromJsonAsync<List<LabelValue>>("/api/dashboard/by-category?days=90");

        Assert.NotNull(categories);
        Assert.Equal(s!.Revenue, categories.Sum(c => c.Value));
        Assert.Equal(categories.OrderByDescending(c => c.Value).Select(c => c.Label), categories.Select(c => c.Label));
    }

    [Fact]
    public async Task Trend_is_daily_for_short_ranges()
    {
        var points = await _client.GetFromJsonAsync<List<TrendPoint>>("/api/dashboard/trend?days=30");

        Assert.NotNull(points);
        Assert.InRange(points.Count, 1, 31);
        Assert.Equal(points.Count, points.Select(p => p.Period.Date).Distinct().Count());
        Assert.Equal(points.OrderBy(p => p.Period), points);
    }

    [Fact]
    public async Task Trend_is_monthly_for_a_year()
    {
        var points = await _client.GetFromJsonAsync<List<TrendPoint>>("/api/dashboard/trend?days=365");

        Assert.NotNull(points);
        Assert.InRange(points.Count, 12, 13);
        Assert.All(points, p => Assert.Equal(1, p.Period.Day));
    }

    [Fact]
    public async Task Top_products_respects_take_and_is_ranked_by_revenue()
    {
        var top = await _client.GetFromJsonAsync<List<TopProduct>>("/api/dashboard/top-products?days=365&take=3");

        Assert.NotNull(top);
        Assert.Equal(3, top.Count);
        Assert.True(top[0].Revenue >= top[1].Revenue && top[1].Revenue >= top[2].Revenue);
    }
}
