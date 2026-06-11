using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmartWealthManager.API.Data;
using SmartWealthManager.API.Dtos;
using SmartWealthManager.API.Models;

namespace SmartWealthManager.API.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    /// <summary>
    /// Handles user registration, security hashing, and database saving.
    /// </summary>
    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto registerDto)
    {
        // 1. Check if user already exists
        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == registerDto.Email);
        if (existingUser != null)
            return null; // Return null to signal controller that registration failed due to duplicate email

        // 2. Hash the password securely using BCrypt (Salting is auto-handled)
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password);

        // 3. Map DTO to our EF database Entity
        var user = new User
        {
            Email = registerDto.Email,
            PasswordHash = passwordHash,
            FullName = registerDto.FullName,
            Currency = registerDto.Currency
        };

        // 4. Save to Database
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // 5. Instantly log them in by generating and returning their session Token
        var token = CreateToken(user.Id, user.Email, user.FullName);
        var expiryMinutesValue = _configuration["JwtSettings:ExpiryMinutes"] ?? "60";
        var expiresAt = DateTime.UtcNow.AddMinutes(Convert.ToDouble(expiryMinutesValue));

        return new AuthResponseDto
        {
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Token = token,
            Currency = user.Currency,
            ExpiresAt = expiresAt
        };
    }

    /// <summary>
    /// Checks credentials and logs the user in.
    /// </summary>
    public async Task<AuthResponseDto?> LoginAsync(LoginDto loginDto)
    {
        // 1. Lookup the user by email
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == loginDto.Email);
        if (user == null)
            return null; // Email doesn't exist

        // 2. Verify password by comparing user input with stored secure hash
        if (!VerifyPasswordHash(loginDto.Password, user.PasswordHash))
            return null; // Incorrect password

        // 3. User is valid, generate and write a new token
        var token = CreateToken(user.Id, user.Email, user.FullName);
        var expiryMinutesValue = _configuration["JwtSettings:ExpiryMinutes"] ?? "60";
        var expiresAt = DateTime.UtcNow.AddMinutes(Convert.ToDouble(expiryMinutesValue));

        return new AuthResponseDto
        {
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Token = token,
            Currency = user.Currency,
            ExpiresAt = expiresAt
        };
    }

    public bool VerifyPasswordHash(string password, string passwordHash)
    {
        // BCrypt extracts salt stored inside the hash string automatically to verify
        return BCrypt.Net.BCrypt.Verify(password, passwordHash);
    }

    /// <summary>
    /// Generates a signed, secure cryptographic JSON Web Token.
    /// </summary>
    public string CreateToken(int userId, string email, string fullName)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["Secret"] ?? throw new Exception("JWT Secret not configured in appsettings!");
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Claims are pieces of user information encoded inside the token string.
        // The front-end can read these safely, and our API can authorize users based on them.
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Name, fullName)
        };

        var expiryMinutesValue = jwtSettings["ExpiryMinutes"] ?? "60";
        var expires = DateTime.UtcNow.AddMinutes(Convert.ToDouble(expiryMinutesValue));

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}