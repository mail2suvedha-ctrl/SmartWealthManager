using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartWealthManager.API.Services;

namespace SmartWealthManager.API.Controllers;

[Authorize] // Protected: Ensures only authorized token owners can pull financial metrics
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>
    /// Fetches aggregated monthly insights.
    /// URL: GET /api/dashboard/summary?month=6&year=2026
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] int month, [FromQuery] int year)
    {
        // Fallback to current month/year if omitted or invalid
        if (month < 1 || month > 12) month = DateTime.UtcNow.Month;
        if (year < 2000) year = DateTime.UtcNow.Year;

        var userId = GetCurrentUserId();
        var summary = await _dashboardService.GetMonthlySummaryAsync(userId, month, year);
        return Ok(summary);
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            throw new Exception("Unauthorized user token detected.");

        return int.Parse(userIdClaim.Value);
    }
}