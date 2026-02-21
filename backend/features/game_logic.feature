Feature: Basic Game Flow
  As a player
  I want to play a standard game of Blackjack
  So that I can try to beat the dealer

  Background:
    Given I start a new game with 100 chips

  Scenario: Initial Deal
    Then I should have 2 cards
    And the dealer should have 2 cards
    And the dealer should have 1 hidden card
    And the game status should be "playing"

  Scenario: Player Hits and Updates Score
    # We will mock the deck to ensure predictable results if possible, 
    # but for basic flow we assume random deck is fine or checks status
    When I choose to "hit"
    Then I should have 3 cards
  
  Scenario: Player Busts
    # Requires a way to force cards or repeat hits until bust
    Given I have a hand close to 21
    When I choose to "hit" and draw a high card
    Then the game status should be "lost"
    And I should see "Bust" message

  Scenario: Player Stands and Dealer Plays
    When I choose to "stand"
    Then the game status should be one of "won", "lost", "push", "blackjack"
    And the dealer should have revealed their hidden card
