using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartWealthManager.API.Dtos;
using SmartWealthManager.API.Services;

namespace SmartWealthManager.API.Controllers;

[Authorize] // Protected: Users can only interact with their own budgets
[ApiController]
[Route("api/[controller]")]
public class BudgetController : ControllerBase
{
    private readonly IBudgetService _budgetService;

    public BudgetController(IBudgetService budgetService)
    {
        _budgetService = budgetService;
    }

    /// <summary>
    /// Gets all budget tracking progress cards for a given month and year.
    /// URL query template: GET /api/budget?month=6&year=2026
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetBudgets([FromQuery] int month, [FromQuery] int year)
    {
        // Default to current month/year if not provided in request
        if (month < 1 || month > 12) month = DateTime.UtcNow.Month;
        if (year < 2000) year = DateTime.UtcNow.Year;

        var userId = GetCurrentUserId();
        var progress = await _budgetService.GetUserBudgetsWithProgressAsync(userId, month, year);
        return Ok(progress);
    }

    /// <summary>
    /// Sets or updates a budget limit for a category.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> SetBudget([FromBody] CreateBudgetDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetCurrentUserId();
        var result = await _budgetService.SetBudgetAsync(dto, userId);

        if (result == null)
            return BadRequest(new { message = "Invalid category. Budgets can only be set for valid Expense categories." });

        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBudget(int id)
    {
        var userId = GetCurrentUserId();
        var success = await _budgetService.DeleteBudgetAsync(id, userId);

        if (!success)
            return NotFound(new { message = "Budget limit record not found." });

        return NoContent();
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            throw new Exception("Unauthorized user token detected.");

        return int.Parse(userIdClaim.Value);
    }
}