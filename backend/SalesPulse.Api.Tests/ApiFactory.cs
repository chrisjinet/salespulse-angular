using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.MsSql;

namespace SalesPulse.Api.Tests;

/// <summary>
/// Starts a throwaway SQL Server container and points the API at it.
/// The API creates the schema and seeds demo data on startup, so every run starts from a known state.
/// Set SALESPULSE_TEST_CONNECTION to use an existing (empty) database instead of Docker.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private static readonly string? ExternalConnection = Environment.GetEnvironmentVariable("SALESPULSE_TEST_CONNECTION");

    private readonly MsSqlContainer? _sql = ExternalConnection is null
        ? new MsSqlBuilder("mcr.microsoft.com/mssql/server:2022-latest").Build()
        : null;

    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.UseSetting("ConnectionStrings:Default",
            ExternalConnection ?? _sql!.GetConnectionString().Replace("Database=master", "Database=SalesPulseTests"));

    public Task InitializeAsync() => _sql?.StartAsync() ?? Task.CompletedTask;

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        if (_sql is not null) await _sql.DisposeAsync();
    }
}

[CollectionDefinition(nameof(ApiCollection))]
public class ApiCollection : ICollectionFixture<ApiFactory>;
