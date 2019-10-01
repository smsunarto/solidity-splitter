pragma solidity ^0.5.10;

import './Pausable.sol';
import './SafeMath.sol';

contract Splitter is Pausable {
    using SafeMath for uint256;

    mapping(address => uint256) public balance;

    event LogSplit(address sender, address[2] receivers, uint256 amount);

    function splitEth(address _participant1, address _participant2) public payable whenNotPaused {
        require(_participant1 != address(0) && _participant2 != address(0), "Splitter: address field is malformed");
        require(_participant1 != msg.sender && _participant2 != msg.sender, "Splitter: can't split to yourself");
        require(_participant1 != _participant2, "Splitter: _participant1 and _participant2 can't be the same");
        require(msg.value > 0, "Splitter: value can't be 0");
        require(msg.value % 2 == 0, "Splitter: splitted result is not round");

        uint256 _splittedValue = msg.value.div(2);
        emit LogSplit(msg.sender, [_participant1, _participant2], _splittedValue);
        balance[_participant1] = balance[_participant1].add(_splittedValue);
        balance[_participant2] = balance[_participant2].add(_splittedValue);
    }

    function withdraw() public whenNotPaused {
        require(balance[msg.sender] > 0, "Splitter: balance can't be 0");

        uint256 _value = balance[msg.sender];
        balance[msg.sender] = 0;
        msg.sender.transfer(_value);
    }
}
