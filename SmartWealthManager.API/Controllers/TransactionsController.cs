using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartWealthManager.API.Dtos;
using SmartWealthManager.API.Services;

namespace SmartWealthManager.API.Controllers;

[Authorize] // PROTECTS THE ENTIRE CONTROLLER: Only requests with a valid JWT Token can access these routes!
[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _transactionService;

    public TransactionsController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetTransactions()
    {
        var userId = GetCurrentUserId();
        var transactions = await _transactionService.GetUserTransactionsAsync(userId);
        return Ok(transactions);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTransaction(int id)
    {
        var userId = GetCurrentUserId();
        var transaction = await _transactionService.GetTransactionByIdAsync(id, userId);
        
        if (transaction == null)
            return NotFound(new { message = "Transaction not found." });

        return Ok(transaction);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetCurrentUserId();
        var result = await _transactionService.CreateTransactionAsync(dto, userId);

        if (result == null)
            return BadRequest(new { message = "Invalid category selected." });

        return CreatedAtAction(nameof(GetTransaction), new { id = result.Id }, result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTransaction(int id)
    {
        var userId = GetCurrentUserId();
        var success = await _transactionService.DeleteTransactionAsync(id, userId);

        if (!success)
            return NotFound(new { message = "Transaction not found or you are unauthorized." });

        return NoContent(); // 204 No Content
    }

    /// <summary>
    /// HELPER METHOD: Safely extracts the UserId claim encoded inside the caller's JWT token.
    /// This prevents malicious users from executing actions using other users' accounts.
    /// </summary>
    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            throw new Exception("Unauthorized user token detected.");

        return int.Parse(userIdClaim.Value);
    }
}