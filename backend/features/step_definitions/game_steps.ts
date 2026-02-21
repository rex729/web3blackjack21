import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { GameService } from '../../src/services/gameService';

let game: GameService;

Given('I start a new game with {int} chips', function (bet: number) {
    game = new GameService();
    game.startGame(bet);
});

Then('I should have {int} cards', function (count: number) {
    assert.equal(game.playerHand.length, count);
});

Then('the dealer should have {int} cards', function (count: number) {
    assert.equal(game.dealerHand.length, count);
});

Then('the dealer should have {int} hidden card', function (count: number) {
    const hiddenCount = game.dealerHand.filter(c => c.hidden).length;
    assert.equal(hiddenCount, count);
});

Then('the game status should be {string}', function (status: string) {
    assert.equal(game.status, status);
});

When('I choose to {string}', function (action: string) {
    if (action === 'hit') {
        game.hit();
    } else if (action === 'stand') {
        game.dealerTurn();
    }
});

// For "Player Busts" scenario - we need to force state. 
// Since GameService deck is private, we can't easily stack the deck without modifying GameService or using "any" casting.
// For now, we'll use a loop to hit until bust for the "Bust" scenario test, or mock if we want specific cards.
// Simpler approach for now: modifying checks to be generic or use 'any' to inject state.

Given('I have a hand close to 21', function () {
    // Inject a specific hand: King (10) + 9 = 19
    game = new GameService();
    game.startGame(100);
    // HACK: Force specific cards for testing
    game.playerHand = [
        { suit: 'hearts', value: 'K' },
        { suit: 'hearts', value: '9' }
    ];
    // Ensure next card in deck causes bust (e.g., King)
    // Accessing private deck via (game as any)
    (game as any).deck.push({ suit: 'spades', value: 'K' }); // Last pushed is popped last? No, pop takes from end.
    (game as any).deck.push({ suit: 'spades', value: 'K' });
});

When('I choose to {string} and draw a high card', function (action: string) {
    if (action === 'hit') {
        game.hit();
    }
});

Then('I should see {string} message', function (msgFragment: string) {
    assert.ok(game.message.includes(msgFragment), `Expected message to include "${msgFragment}", but got "${game.message}"`);
});

Then('the game status should be one of {string}, {string}, {string}, {string}', function (s1, s2, s3, s4) {
    const validStatuses = [s1, s2, s3, s4];
    assert.ok(validStatuses.includes(game.status), `Status ${game.status} is not in ${validStatuses}`);
});

Then('the dealer should have revealed their hidden card', function () {
    const hiddenCount = game.dealerHand.filter(c => c.hidden).length;
    assert.equal(hiddenCount, 0);
});
