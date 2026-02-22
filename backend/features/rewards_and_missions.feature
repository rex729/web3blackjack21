Feature: Daily Rewards and Missions Security

  Scenario Outline: Preventing concurrent ad reward claims (Race Condition)
    Given a user "hacker@test.com" with <initial_balance> chips and 0 ad views today
    When the user concurrently requests <concurrent_requests> ad rewards
    Then the user should successfully claim the reward at most <max_success_count> times

    Examples:
      | initial_balance | concurrent_requests | max_success_count |
      | 10000          | 10                  | 3                 |

  Scenario: Ad limit enforcement
    Given a user "legit@test.com" with 3 ad views today
    When the user requests an ad reward
    Then the claim should fail with the error "Daily reward limit of 3 reached."

  Scenario Outline: Preventing concurrent mission claims (Race Condition)
    Given a user "hacker2@test.com" has completed the "streak3" mission but not claimed it
    When the user concurrently requests to claim the "streak3" mission <concurrent_requests> times
    Then the user should only successfully claim the mission reward <expected_success_count> time
    And the user should have received the mission reward chips exactly once

    Examples:
      | concurrent_requests | expected_success_count |
      | 15                  | 1                      |

  Scenario: Uncompleted mission claim rejection
    Given a user "newbie@test.com" has a current win streak of 1
    When the user attempts to claim the "streak5" mission
    Then the claim should fail with the error "Mission not completed yet"
