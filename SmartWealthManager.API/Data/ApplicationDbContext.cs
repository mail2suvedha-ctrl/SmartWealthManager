using Microsoft.EntityFrameworkCore;
using SmartWealthManager.API.Models;

namespace SmartWealthManager.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Category> Categories { get; set; } = null!;
    public DbSet<Transaction> Transactions { get; set; } = null!;
    public DbSet<Budget> Budgets { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Ensure ClientGeneratedId is marked as unique index for super fast queries
        modelBuilder.Entity<Transaction>()
            .HasIndex(t => t.ClientGeneratedId)
            .IsUnique();

        // Enforce unique Category names for users to avoid duplicate categories
        modelBuilder.Entity<Category>()
            .HasIndex(c => new { c.UserId, c.Name })
            .IsUnique();

        // Unique rule for Budgets (User cannot have two budgets for same category in same month/year)
        modelBuilder.Entity<Budget>()
            .HasIndex(b => new { b.UserId, b.CategoryId, b.Month, b.Year })
            .IsUnique();

        // EF Core Data Seeding: Auto-inserts default categories into database on creation
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, UserId = null, Name = "Salary", Type = "Income", Icon = "💼" },
            new Category { Id = 2, UserId = null, Name = "Freelance", Type = "Income", Icon = "💻" },
            new Category { Id = 3, UserId = null, Name = "Bonus", Type = "Income", Icon = "🎉" },
            new Category { Id = 4, UserId = null, Name = "Food", Type = "Expense", Icon = "🍔" },
            new Category { Id = 5, UserId = null, Name = "Travel", Type = "Expense", Icon = "✈️" },
            new Category { Id = 6, UserId = null, Name = "Shopping", Type = "Expense", Icon = "🛍️" },
            new Category { Id = 7, UserId = null, Name = "Rent", Type = "Expense", Icon = "🏠" },
            new Category { Id = 8, UserId = null, Name = "Medical", Type = "Expense", Icon = "🏥" },
            new Category { Id = 9, UserId = null, Name = "Education", Type = "Expense", Icon = "📚" },
            new Category { Id = 10, UserId = null, Name = "Entertainment", Type = "Expense", Icon = "🎬" },
            new Category { Id = 11, UserId = null, Name = "Gym", Type = "Expense", Icon = "💪" },
            new Category { Id = 12, UserId = null, Name = "Others", Type = "Expense", Icon = "📦" }
        );
    }
}