pragma solidity ^0.5.10;

import './Ownable.sol';
import './Pausable.sol';
import './SafeMath.sol';

contract Splitter is Ownable, Pausable {
    using SafeMath for uint256;

    address[] internal participants;
    uint256 public participantsCount;
    bool private _paused;

    // We map the index of an address for efficiency
    mapping(address => uint256) public indexOfParticipants;

    event LogSplit(address[] receiver, uint256 amount);
    event LogAddParticipant(address participant);
    event LogRemoveParticipant(address participant);

    constructor() public {
        // Initialized participants array with the
        // first element to the burn address which there's
        // no private key for because we are going to assume
        // the index 0 as non-participant in `indexOfParticipants` map.
        // Note: All mapping values default to 0
        participants.push(address(0));
    }

    modifier onlyParticipant() {
        require(indexOfParticipants[msg.sender] != 0, "Splitter: only participants can use this function");
        _;
    }

    function addParticipant(address newParticipant) public onlyOwner whenNotPaused {
        // Subtract by 1 because the first entry is a placeholder
        require(indexOfParticipants[newParticipant] == 0, "Splitter: the address is already a participant");
        participantsCount = participantsCount.add(1);
        indexOfParticipants[newParticipant] = participants.length;
        participants.push(newParticipant);

        emit LogAddParticipant(newParticipant);
    }

    function removeParticipant(address targetParticipant) public onlyOwner whenNotPaused {
        // We don't need to delete from participants array
        // because the ocntract assumes that any address that is mapped
        // to index 0 is not a participant so that address will not be used
        // anyway
        require(indexOfParticipants[targetParticipant] != 0, "Splitter: the remove target address is not a participant");
        participantsCount = participantsCount.sub(1);
        indexOfParticipants[targetParticipant] = 0;

        emit LogRemoveParticipant(targetParticipant);
    }

    function getActiveParticipants() public view returns(address[] memory) {
        address[] memory _participants = new address[](participantsCount);
        uint256 _participantsIterator = 0;

        // Starts with 1 because index 0 is unused.
        // To be a valid receivers, an addres should have a non-zero index
        // in the participants array and it can't be the caller of the
        // function.
        for (uint256 i = 1; i < participants.length; i++) {
            if (indexOfParticipants[participants[i]] != 0) {
                _participants[_participantsIterator] = participants[i];
                _participantsIterator++;
            }

            // Breaks early if we already have all the possible receivers
            if (_participantsIterator == participantsCount) {
                break;
            }
        }

        return _participants;
    }

    // Helper function \\
    function getReceivers() internal view returns(address[] memory) {
        address[] memory _receivers = new address[](participantsCount - 1);
        uint256 _receiversIterator = 0;

        // Starts with 1 because index 0 is unused.
        // To be a valid receivers, an addres should have a non-zero index
        // in the participants array and it can't be the caller of the
        // function.
        for (uint256 i = 1; i < participants.length; i++) {
            if (indexOfParticipants[participants[i]] != 0 && participants[i] != msg.sender) {
                _receivers[_receiversIterator] = participants[i];
                _receiversIterator++;
            }

            // Breaks early if we already have all the possible receivers
            if (_receiversIterator == participantsCount - 1) {
                break;
            }
        }

        return _receivers;
    }

    function splitEth() public payable onlyParticipant whenNotPaused {
        require(msg.sender != address(0), "Splitter: address field is malformed");
        require(msg.value > 0, "Splitter: value can't be 0");
        require(participantsCount - 1 >= 1, "Splitter: not enough participants");
        require(msg.value % (participantsCount - 1) == 0, "Splitter: splitted result is not round");

        address[] memory _receivers = getReceivers();

        emit LogSplit(_receivers, msg.value / _receivers.length);
        for (uint256 i = 0; i < _receivers.length; i++) {
            address payable _receiver = address(uint160(_receivers[i]));
            _receiver.transfer(msg.value / _receivers.length);
        }
    }
}
