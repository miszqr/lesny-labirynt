const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { generateMaze } = require(path.join(process.env.GAME_ROOT || path.resolve(__dirname, '..'), 'maze.js'));
const { seededRandom, testSeeds, withSeed } = require('./helpers/random.cjs');
const { explore } = require('./helpers/routes.cjs');

for (const size of [4, 6, 8]) test(`generator ${size}x${size}: graph, gate and reachable key across seeded maps`, () => {
  for (const seed of testSeeds(1000)) withSeed(size, seed, 'generator', () => {
    const maze = generateMaze(size, seededRandom(seed)), count = size * size;
    const validCell = id => Number.isInteger(id) && id >= 0 && id < count;
    assert.equal(maze.n, size); assert.equal(maze.cells.length, count);
    assert(validCell(maze.start)); assert(validCell(maze.exit)); assert.notEqual(maze.start, maze.exit);
    for (const [id, cell] of maze.cells.entries()) {
      assert.equal(cell.id, id); assert.equal(new Set(cell.links).size, cell.links.length);
      for (const next of cell.links) {
        assert(validCell(next), `invalid neighbor ${next} at cell ${id}`);
        assert.equal(Math.abs(id % size - next % size) + Math.abs(Math.floor(id / size) - Math.floor(next / size)), 1);
        assert(maze.cells[next].links.includes(id), `asymmetric edge ${id}-${next}`);
      }
    }
    const full = explore(maze), closed = explore(maze, maze.start, false);
    assert.equal(full.parent.size, count, 'every cell is reachable');
    assert.equal(maze.cells.reduce((sum, cell) => sum + cell.links.length, 0), 2 * (count - 1), 'maze is a tree');
    assert.equal(full.distance.get(maze.exit), Math.max(...full.distance.values()), 'home is farthest from start');
    assert.equal(maze.gate.length, 2); assert(maze.gate.every(validCell)); assert.notEqual(...maze.gate);
    assert(maze.cells[maze.gate[0]].links.includes(maze.gate[1]), 'gate lies on an actual passage');
    assert.equal(closed.parent.has(maze.exit), false, 'closed gate prevents reaching home');
    assert(closed.parent.has(maze.gate[0])); assert.equal(closed.parent.has(maze.gate[1]), false);
    assert(validCell(maze.keeper)); assert(closed.parent.has(maze.keeper), 'key is reachable without crossing gate');
    assert.equal(maze.places.length, 3); assert.equal(new Set(maze.places).size, 3);
    assert(maze.places.includes(maze.keeper));
    for (const cell of maze.places) {
      assert(validCell(cell)); assert.notEqual(cell, maze.start); assert.notEqual(cell, maze.exit);
      assert.equal(maze.gate.includes(cell), false, 'encounters do not occupy gate endpoints');
    }
  });
});
