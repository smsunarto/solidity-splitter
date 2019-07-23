const Splitter = artifacts.require('Splitter');
const truffleAssert = require('truffle-assertions');

contract('Splitter', accounts => {
  const [owner, alice, bob, carol, unknown] = accounts;
  let instance;

  beforeEach(async () => {
    instance = await Splitter.new();
  });

  describe('pause', async () => {
    context('as owner', async () => [
      it('should successfully pause contract', async () => {
        await truffleAssert.passes(instance.pause({ from: owner }));
        const paused = await instance.paused();
        assert.equal(paused, true);
      })
    ]);
    context('as non-owner', async () => [
      it('should unsuccessfully pause contract', async () => {
        await truffleAssert.fails(
          instance.pause({ from: unknown }),
          truffleAssert.ErrorType.REVERT,
          'Ownable: caller is not the owner'
        );
      })
    ]);
  });

  describe('unpause', async () => {
    context('as owner', async () => [
      it('should successfully unpause contract', async () => {
        await truffleAssert.passes(instance.pause({ from: owner }));
        await truffleAssert.passes(instance.unpause({ from: owner }));
        const paused = await instance.paused();
        assert.equal(paused, false);
      })
    ]);
    context('as non-owner', async () => [
      it('should unsuccessfully unpause contract', async () => {
        await truffleAssert.passes(instance.pause({ from: owner }));
        await truffleAssert.fails(
          instance.unpause({ from: unknown }),
          truffleAssert.ErrorType.REVERT,
          'Ownable: caller is not the owner'
        );
      })
    ]);
  });

  describe('splitEth', async () => {
    it('should successfully split ETH', async () => {
      await truffleAssert.passes(
        instance.splitEth(bob, carol, { from: alice, value: 2 })
      );
      const bobBalance = await instance.balance.call(bob);
      const carolBalance = await instance.balance.call(carol);
      assert.equal(bobBalance, 1);
      assert.equal(carolBalance, 1);
    });

    context(
      'with one of the participants argument being the sender',
      async () => [
        it('should fail', async () => {
          await truffleAssert.fails(
            instance.splitEth(bob, alice, { from: alice, value: 2 }),
            truffleAssert.ErrorType.REVERT,
            "Splitter: can't split to yourself"
          );
        })
      ]
    );

    context(
      'with one of the participants argument being the same',
      async () => [
        it('should fail', async () => {
          await truffleAssert.fails(
            instance.splitEth(bob, bob, {
              from: alice,
              value: 2
            }),
            truffleAssert.ErrorType.REVERT,
            "Splitter: _participant1 and _participant2 can't be the same"
          );
        })
      ]
    );

    context('with the value being 0', async () => [
      it('should fail', async () => {
        await truffleAssert.fails(
          instance.splitEth(bob, carol, {
            from: alice,
            value: 0
          }),
          truffleAssert.ErrorType.REVERT,
          "Splitter: value can't be 0"
        );
      })
    ]);

    context('with the value that is not fully divided by 2', async () => [
      it('should fail', async () => {
        await truffleAssert.fails(
          instance.splitEth(bob, carol, {
            from: alice,
            value: 1
          }),
          truffleAssert.ErrorType.REVERT,
          'Splitter: splitted result is not round'
        );
      })
    ]);
  });

  describe('withdraw', async () => {
    context('as participant', async () => [
      it('should successfully withdraw', async () => {
        await truffleAssert.passes(
          instance.splitEth(bob, carol, {
            from: alice,
            value: 2
          })
        );
        const bobBalance = await web3.eth.getBalance(bob);
        const _tx = await instance.withdraw({ from: bob });
        const tx = await web3.eth.getTransaction(_tx.receipt.transactionHash);
        const gasUsed = web3.utils.toBN(await _tx.receipt.gasUsed);
        const gasPrice = web3.utils.toBN(await tx.gasPrice);
        const gas = gasUsed.mul(gasPrice);
        const bobNewBalance = await web3.eth.getBalance(bob);
        assert.equal(
          bobNewBalance,
          web3.utils
            .toBN(bobBalance)
            .add(web3.utils.toBN('1'))
            .sub(gas)
            .toString()
        );
      }),

      it('should unsuccessfully withdraw the second time', async () => {
        await truffleAssert.passes(
          instance.splitEth(bob, carol, {
            from: alice,
            value: 2
          })
        );
        await truffleAssert.passes(instance.withdraw({ from: bob }));
        await truffleAssert.fails(
          instance.withdraw({ from: bob }),
          truffleAssert.ErrorType.REVERT,
          "Splitter: balance can't be 0"
        );
      })
    ]);

    context('as non-participant', async () => [
      it('should unsuccessfully withdraw', async () => {
        await truffleAssert.fails(
          instance.withdraw({ from: unknown }),
          truffleAssert.ErrorType.REVERT,
          "Splitter: balance can't be 0"
        );
      })
    ]);
  });
});
