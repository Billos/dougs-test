import { fail } from 'assert';

import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Balance, Movement, ValidationErrorMessage } from './movement.model';
import { MovementsController } from './movements.controller';
import { MovementsService } from './movements.service';

describe('MovementsController', () => {
  let controller: MovementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovementsController],
      providers: [MovementsService],
    }).compile();

    controller = module.get<MovementsController>(MovementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return a valid movements validation response', () => {
    const movements: Movement[] = [
      { id: 1, date: new Date('2025-01-02'), label: 'Deposit', amount: 100 },
      { id: 2, date: new Date('2025-01-04'), label: 'Withdrawal', amount: -50 },
    ];
    const balances: Balance[] = [
      { date: new Date('2025-01-01'), balance: 0 },
      { date: new Date('2025-01-03'), balance: 100 },
      { date: new Date('2025-01-05'), balance: 50 },
    ];

    const response = controller.validation(movements, balances);
    expect(response).toEqual(true);
  });

  it('should ignore movements with a date before the first balance', () => {
    const movements: Movement[] = [
      { id: 1, date: new Date('2023-01-01'), label: 'Deposit', amount: 100 },
      { id: 2, date: new Date('2025-01-02'), label: 'Deposit', amount: 100 },
      { id: 3, date: new Date('2025-01-04'), label: 'Withdrawal', amount: -50 },
    ];
    const balances: Balance[] = [
      { date: new Date('2025-01-01'), balance: 0 },
      { date: new Date('2025-01-03'), balance: 100 },
      { date: new Date('2025-01-05'), balance: 50 },
    ];

    const response = controller.validation(movements, balances);
    expect(response).toEqual(true);
  });

  it('should ignore movements with a date after the last balance', () => {
    const movements: Movement[] = [
      { id: 1, date: new Date('2025-01-02'), label: 'Deposit', amount: 100 },
      { id: 2, date: new Date('2025-01-04'), label: 'Withdrawal', amount: -50 },
      { id: 3, date: new Date('2026-01-01'), label: 'Withdrawal', amount: -50 },
    ];
    const balances: Balance[] = [
      { date: new Date('2025-01-01'), balance: 0 },
      { date: new Date('2025-01-03'), balance: 100 },
      { date: new Date('2025-01-05'), balance: 50 },
    ];

    const response = controller.validation(movements, balances);
    expect(response).toEqual(true);
  });

  it('should work with badly ordered movements and balances', () => {
    const movements: Movement[] = [
      { id: 2, date: new Date('2025-01-04'), label: 'Withdrawal', amount: -50 },
      { id: 1, date: new Date('2025-01-02'), label: 'Deposit', amount: 100 },
    ];
    const balances: Balance[] = [
      { date: new Date('2025-01-03'), balance: 100 },
      { date: new Date('2025-01-05'), balance: 50 },
      { date: new Date('2025-01-01'), balance: 0 },
    ];

    const response = controller.validation(movements, balances);
    expect(response).toEqual(true);
  });

  it('should fail and detect a duplicate movement and return an error', () => {
    const movements: Movement[] = [
      { id: 1, date: new Date('2025-01-02'), label: 'Deposit', amount: 100 },
      { id: 1, date: new Date('2025-01-02'), label: 'Deposit', amount: 100 },
      { id: 3, date: new Date('2025-01-04'), label: 'Withdrawal', amount: -50 },
    ];
    const balances: Balance[] = [
      { date: new Date('2025-01-01'), balance: 0 },
      { date: new Date('2025-01-03'), balance: 100 },
      { date: new Date('2025-01-05'), balance: 50 },
    ];

    try {
      controller.validation(movements, balances);
      fail('Expected an error to be thrown');
    } catch (error) {
      if (error instanceof HttpException) {
        expect(error.cause).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'Duplicate',
              message: ValidationErrorMessage.Duplicate,
            }),
          ]),
        );
      } else {
        fail('Expected an HttpException to be thrown');
      }
    }
  });

  it('should fail and detect a missing withdrawal movement and return an error', () => {
    const movements: Movement[] = [{ id: 1, date: new Date('2025-01-02'), label: 'Deposit', amount: 100 }];
    const balances: Balance[] = [
      { date: new Date('2025-01-01'), balance: 0 },
      { date: new Date('2025-01-03'), balance: 100 },
      { date: new Date('2025-01-05'), balance: 50 },
    ];
    try {
      controller.validation(movements, balances);
      fail('Expected an error to be thrown');
    } catch (error) {
      if (error instanceof HttpException) {
        expect(error.cause).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'Difference',
              period: { start: new Date('2025-01-03'), end: new Date('2025-01-05') },
              message: ValidationErrorMessage.WithdrawalDifference,
              difference: 50,
            }),
          ]),
        );
      } else {
        fail('Expected an HttpException to be thrown');
      }
    }
  });

  it('should fail and detect a missing deposit movement and return an error', () => {
    const movements: Movement[] = [{ id: 1, date: new Date('2025-01-04'), label: 'Withdrawal', amount: -50 }];
    const balances: Balance[] = [
      { date: new Date('2025-01-01'), balance: 0 },
      { date: new Date('2025-01-03'), balance: 100 },
      { date: new Date('2025-01-05'), balance: 50 },
    ];
    try {
      controller.validation(movements, balances);
      fail('Expected an error to be thrown');
    } catch (error) {
      if (error instanceof HttpException) {
        expect(error.cause).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'Difference',
              period: { start: new Date('2025-01-01'), end: new Date('2025-01-03') },
              message: ValidationErrorMessage.DepositDifference,
              difference: -100,
            }),
          ]),
        );
      } else {
        fail('Expected an HttpException to be thrown');
      }
    }
  });

  it('should fail if there are not enough balances and return an error', () => {
    const movements: Movement[] = [
      { id: 1, date: new Date('2025-01-02'), label: 'Deposit', amount: 100 },
      { id: 2, date: new Date('2025-01-04'), label: 'Withdrawal', amount: -50 },
    ];
    const balances: Balance[] = [{ date: new Date('2025-01-01'), balance: 0 }];

    try {
      controller.validation(movements, balances);
      fail('Expected an error to be thrown');
    } catch (error) {
      if (error instanceof HttpException) {
        expect(error.cause).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'BalancesMissing',
              message: ValidationErrorMessage.BalancesMissing,
            }),
          ]),
        );
      } else {
        fail('Expected an HttpException to be thrown');
      }
    }
  });
});
