using Microsoft.AspNetCore.Mvc;
using SmartWealthManager.API.Dtos;
using SmartWealthManager.API.Services;

namespace SmartWealthManager.API.Controllers;

[ApiController]
[Route("api/[controller]")] // Translates to route: /api/auth
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
    {
        // Enforces [Required], [EmailAddress] attributes automatically
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.RegisterAsync(registerDto);
        if (result == null)
            return BadRequest(new { message = "An account with this email address already exists." });

        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.LoginAsync(loginDto);
        if (result == null)
            return Unauthorized(new { message = "Invalid email or password." });

        return Ok(result);
    }
}