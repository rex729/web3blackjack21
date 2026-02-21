Feature: RPG Experience and Leveling
  As a player
  I want to earn experience points when I win
  So that I can level up and unlock new cities

  Background:
    Given a user "PlayerOne" exists with 900 XP and 1000 balance

  Scenario: Earn Basic XP on Win in Level 1
    Given "PlayerOne" plays in "level-1"
    When "PlayerOne" wins a game with bet 100
    Then "PlayerOne" should gain 100 XP
    And "PlayerOne" total XP should be 1000
    And "PlayerOne" level should be 2

  Scenario: Earn Multiplier XP on Win in Level 2
    # Level 2 multiplier is 1.1x
    # Base 100 * 1.1 = 110 XP
    Given "PlayerOne" plays in "level-2"
    When "PlayerOne" wins a game with bet 100
    Then "PlayerOne" should gain 110 XP
    And "PlayerOne" total XP should be 1010
    And "PlayerOne" level should be 2

  Scenario: No XP on Loss
    Given "PlayerOne" plays in "level-1"
    When "PlayerOne" loses a game with bet 100
    Then "PlayerOne" should gain 0 XP
    And "PlayerOne" total XP should be 900

  Scenario: No XP on Push
    Given "PlayerOne" plays in "level-1"
    When "PlayerOne" pushes a game with bet 100
    Then "PlayerOne" should gain 0 XP
    And "PlayerOne" total XP should be 900
