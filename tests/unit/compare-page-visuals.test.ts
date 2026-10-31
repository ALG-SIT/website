import { expect, test } from 'bun:test';
import { comparePixels } from '../../scripts/compare-page-visuals';

const image = (width: number, height: number, values: number[]) => ({
  width,
  height,
  data: Uint8Array.from(values.flatMap((value) => [value, value, value, 255])),
});

test('uses independent row strides and counts unmatched columns', () => {
  const a = image(2, 2, [10, 20, 30, 40]);
  const b = image(3, 2, [10, 20, 255, 30, 40, 255]);
  expect(comparePixels(a, b, 45)).toBeCloseTo(100 / 3);
  expect(comparePixels(b, a, 45)).toBeCloseTo(100 / 3);
});

test('counts unmatched rows and crossing width/height differences', () => {
  expect(comparePixels(image(1, 1, [0]), image(1, 2, [0, 0]), 45)).toBe(50);
  expect(
    comparePixels(image(2, 1, [0, 0]), image(1, 2, [0, 0]), 45),
  ).toBeCloseTo(200 / 3);
});

test('applies the RGB threshold within matching dimensions', () => {
  expect(comparePixels(image(2, 1, [0, 0]), image(2, 1, [15, 16]), 45)).toBe(
    50,
  );
});
