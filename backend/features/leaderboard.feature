Feature: Leaderboard
  As a player
  I want to see the top players
  So that I can know who is the richest

  Scenario: Get wealth leaderboard
    Given the following users exist:
      | name  | balance | experience |
      | Alice | 1000    | 100        |
      | Bob   | 5000    | 500        |
      | Carol | 3000    | 300        |
    When I request the "balance" leaderboard
    Then I should see "Bob" at rank 1
    And I should see "Carol" at rank 2
    And I should see "Alice" at rank 3
