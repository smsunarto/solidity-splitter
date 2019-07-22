const Splitter = artifacts.require('Splitter');

contract('Splitter', accounts => {
  const [owner, alice, bob, carol, unknown] = accounts;
  let instance;

  beforeEach(async () => {
    instance = await Splitter.deployed();
  });

  it('should only allow owner to add participant', async () => {
    try {
      await instance.addParticipant(alice, { from: unknown });
    } catch (err) {
      assert.equal(err.reason, 'Ownable: caller is not the owner');
    }
  });

  it('should only allow owner to remove participant', async () => {
    try {
      await instance.removeParticipant(alice, { from: unknown });
    } catch (err) {
      assert.equal(err.reason, 'Ownable: caller is not the owner');
    }
  });

  it('should only allow owner to pause', async () => {
    try {
      await instance.pause({ from: unknown });
    } catch (err) {
      assert.equal(err.reason, 'Ownable: caller is not the owner');
    }
  });

  it('should only allow owner to unpause', async () => {
    try {
      await instance.unpause({ from: unknown });
    } catch (err) {
      assert.equal(err.reason, 'Ownable: caller is not the owner');
    }
  });

  it('should sucessfully add participants', async () => {
    await instance.addParticipant(alice, { from: owner });
    await instance.addParticipant(bob, { from: owner });
    await instance.addParticipant(carol, { from: owner });
    participants = await instance.getActiveParticipants({
      from: unknown
    });
    assert.include(participants, alice);
    assert.include(participants, bob);
    assert.include(participants, carol);
  });

  it('should successfully split ETH', async () => {
    var bobOriginalBalance = await web3.eth.getBalance(bob);
    var carolOriginalBalance = await web3.eth.getBalance(carol);
    await instance.splitEth({ from: alice, value: 2 });

    let bobNewBalance = await web3.eth.getBalance(bob);
    let carolNewBalance = await web3.eth.getBalance(carol);
    assert.equal(
      bobNewBalance,
      web3.utils.toBN(bobOriginalBalance).add(web3.utils.toBN('1'))
    );
    assert.equal(
      carolNewBalance,
      web3.utils.toBN(carolOriginalBalance).add(web3.utils.toBN('1'))
    );
  });

  it('should reject split when value is 0', async () => {
    try {
      await instance.splitEth({ from: alice, value: 0 });
    } catch (err) {
      assert.equal(err.reason, "Splitter: value can't be 0");
    }
  });

  it('should only allow participant to split ETH', async () => {
    try {
      await instance.splitEth({ from: unknown, value: 2 });
    } catch (err) {
      assert.equal(
        err.reason,
        'Splitter: only participants can use this function'
      );
    }
  });

  it('should reject split when splitted ETH has a remainder', async () => {
    try {
      await instance.splitEth({ from: alice, value: 3 });
    } catch (err) {
      assert.equal(err.reason, 'Splitter: splitted result is not round');
    }
  });

  it('should sucessfully remove participants', async () => {
    await instance.removeParticipant(bob, { from: owner });
    await instance.removeParticipant(carol, { from: owner });
    participants = await instance.getActiveParticipants({
      from: unknown
    });
    assert.notInclude(participants, bob);
    assert.notInclude(participants, carol);
  });

  it('should fail removing non-participant address', async () => {
    try {
      await instance.removeParticipant(unknown, { from: owner });
    } catch (err) {
      assert.equal(
        err.reason,
        'Splitter: the remove target address is not a participant'
      );
    }
  });

  it('should reject split when not enough participant', async () => {
    try {
      await instance.splitEth({ from: alice, value: 2 });
    } catch (err) {
      assert.equal(err.reason, 'Splitter: not enough participants');
    }
  });

  it('should reject split when paused', async () => {
    await instance.pause({ from: owner });

    try {
      await instance.splitEth({ from: alice, value: 2 });
    } catch (err) {
      assert.equal(err.reason, 'Pausable: paused');
    }

    await instance.unpause({ from: owner });
  });

  it('should reject add participant when paused', async () => {
    await instance.pause({ from: owner });

    try {
      await instance.addParticipant(bob, { from: owner });
    } catch (err) {
      assert.equal(err.reason, 'Pausable: paused');
    }

    await instance.unpause({ from: owner });
  });

  it('should reject remove participant when paused', async () => {
    await instance.pause({ from: owner });

    try {
      await instance.removeParticipant(alice, { from: owner });
    } catch (err) {
      assert.equal(err.reason, 'Pausable: paused');
    }

    await instance.unpause({ from: owner });
  });
});
