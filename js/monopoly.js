var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 50;
Monopoly.doubleCounter = 200;

Monopoly.init = function () {
    $(document).ready(function () {
        Monopoly.adjustBoardSize();
        $(window).bind("resize", Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();
    });
};

Monopoly.start = function () {
    Monopoly.showPopup("intro")
};


Monopoly.initDice = function () {
    $(".dice").click(function () {
        if (Monopoly.allowRoll) {
            Monopoly.rollDice();
        }
    });
};


Monopoly.getCurrentPlayer = function () {
    return $(".player.current-turn");
}; // choose current player

Monopoly.getPlayersCell = function (player) {
    return player.closest(".cell");
};


Monopoly.getPlayersMoney = function (player) {
    return parseInt(player.attr("data-money"));
};

Monopoly.updatePlayersMoney = function (player, amount) {
    var popup = Monopoly.getPopup("broke");// declared variable with selector
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    $(".input_money_player").text("playersMoney: " + player.attr("id") + " has " + playersMoney);//
// now it shows current amount of money, last player which account was updated
    if (playersMoney < 0) {
        popup.find("button").unbind("click").bind("click", function () {
            Monopoly.handleAction(player, "broke");
        });
        Monopoly.showPopup("broke");

    }// made nice popup instead of alert message
    player.attr("data-money", playersMoney);
    player.attr("title", player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");
};

Monopoly.rollDice = function () { // fuction that define values of dices
    var result1 = Math.floor(Math.random() * 6) + 1;
    var result2 = Math.floor(Math.random() * 6) + 1;
    $(".dice").find(".dice-dot").css("opacity", 0);
    $(".dice#dice1").attr("data-num", result1).find(".dice-dot.num" + result1).css("opacity", 1);
    $(".dice#dice2").attr("data-num", result2).find(".dice-dot.num" + result2).css("opacity", 1);
    if (result1 == result2) {
        Monopoly.doubleCounter++;
    }
    var currentPlayer = Monopoly.getCurrentPlayer();
    Monopoly.handleAction(currentPlayer, "move", result1 + result2);
};


Monopoly.movePlayer = function (player, steps) { // function that moves player on the map
    Monopoly.allowRoll = false;
    var playerMovementInterval = setInterval(function () {
        if (steps == 0) {
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
        } else {
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            nextCell.find(".content").append(player);
            steps--;
        }
    }, 200);
};


Monopoly.handleTurn = function () { // fuction that defines different conditions for player accordignly to game situation
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    if (playerCell.is(".available.property")) {
        Monopoly.handleBuyProperty(player, playerCell);
    } else if (playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))) {
        Monopoly.handlePayRent(player, playerCell);
        player.removeClass("happy");
    } else if (playerCell.is(".property:not(.available)") && playerCell.hasClass(player.attr("id"))) {
        Monopoly.handlePayRent(player, playerCell);// this condition was implemented for changing player to happy smile, whe he on his property
        player.addClass("happy");
    } else if (playerCell.is(".go-to-jail")) {
        Monopoly.handleGoToJail(player);
        player.removeClass("happy");
        player.addClass("jailed");
    } else if (playerCell.is(".chance")) {
        Monopoly.handleChanceCard(player);
        player.removeClass("happy");
    } else if (playerCell.is(".community")) {
        Monopoly.handleCommunityCard(player);
        player.removeClass("happy");

    } else {
        Monopoly.setNextPlayerTurn();
    }
}

Monopoly.setNextPlayerTurn = function () {
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
    var playerId = parseInt(currentPlayerTurn.attr("id").replace("player", ""));
    var nextPlayerId = playerId + 1;
    if (nextPlayerId > $(".player").length) {
        nextPlayerId = 1;
    }
    currentPlayerTurn.removeClass("current-turn");
    var nextPlayer = $(".player#player" + nextPlayerId);
    nextPlayer.addClass("current-turn");
    if (nextPlayer.is(".jailed")) {
        var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
        currentJailTime++;
        nextPlayer.attr("data-jail-time", currentJailTime);
        if (currentJailTime > 3) {
            nextPlayer.removeClass("jailed");
            nextPlayer.removeAttr("data-jail-time");
        }
        Monopoly.setNextPlayerTurn();
        return;
    }
    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};


Monopoly.handleBuyProperty = function (player, propertyCell) {// fuction for buying property
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click", function () {
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")) {
            Monopoly.handleBuy(player, propertyCell, propertyCost);


        } else {
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};

Monopoly.handlePayRent = function (player, propertyCell) { // fuction for property rent
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click", function () {
        var properyOwner = $(".player#" + properyOwnerId);
        Monopoly.updatePlayersMoney(player, currentRent);
        Monopoly.updatePlayersMoney(properyOwner, -1 * currentRent);
        Monopoly.closeAndNextTurn();
    });
    Monopoly.showPopup("pay");
};


Monopoly.handleGoToJail = function (player) {
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click", function () {
        Monopoly.handleAction(player, "jail");
    });
    Monopoly.showPopup("jail");
};


Monopoly.handleChanceCard = function (player) { // function that makes chance card appear randomly
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function (chanceJson) {
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", chanceJson["action"]).attr("data-amount", chanceJson["amount"]);
    }, "json");  //follow directions for action (move or add cash) and the amount of spaces or dollars
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("chance");
};



Monopoly.handleCommunityCard = function (player) {                               //function executes community cards
    var popup = Monopoly.getPopup("community");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function (communityJson) {   //gets community card from ajax
        popup.find(".popup-content #text-placeholder").text(communityJson["content"]);
        popup.find(".popup-title").text(communityJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", communityJson["action"]).attr("data-amount", communityJson["amount"]);
    }, "json");              //follow directions for action (move or add cash) and the amount of spaces or dollars
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });

    Monopoly.showPopup("community");    //display the popup

};



Monopoly.sendToJail = function (player) { //function that send player to the jail 
    player.addClass("jailed");// adding class "jailed"
    player.attr("data-jail-time", 1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};


Monopoly.getPopup = function (popupId) { // function that's responsible for popup functionality
    return $(".popup-lightbox .popup-page#" + popupId);
};

Monopoly.calculateProperyCost = function (propertyCell) { //setting property cost
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group", "")) * 5;
    if (cellGroup == "rail") {
        cellPrice = 10;
    }
    return cellPrice;
};


Monopoly.calculateProperyRent = function (propertyCost) {
    return propertyCost / 2; //defines cost of property rent
};


Monopoly.closeAndNextTurn = function () { // function that closing popups
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

Monopoly.initPopups = function () { // intro popup
    $(".popup-page#intro").find("button").click(function () {
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput(numOfPlayers)) {
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};


Monopoly.handleBuy = function (player, propertyCell, propertyCost) { // fucntion that defines condition when player can or can't afford property
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost) {
        Monopoly.showErrorMsg();
        Monopoly.playSound("maybe-next-time");
    } else {
        Monopoly.updatePlayersMoney(player, propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);

        propertyCell.removeClass("available")
            .addClass(player.attr("id"))
            .attr("data-owner", player.attr("id"))
            .attr("data-rent", rent);
        Monopoly.setNextPlayerTurn();
    }
};





Monopoly.handleAction = function (player, action, amount) { // this fuction reffering to another functions accordingly to user actions
    switch (action) {
        case "move":
            Monopoly.movePlayer(player, amount);
            break;
        case "pay":
            Monopoly.updatePlayersMoney(player, amount);
            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
    };
    Monopoly.closePopup();
};





Monopoly.createPlayers = function (numOfPlayers) { // function that creates amount of player accordingly to first input
    var startCell = $(".go");
    for (var i = 1; i <= numOfPlayers; i++) {
        var player = $("<div />").addClass("player shadowed").attr("id", "player" + i).attr("title", "player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i == 1) {
            player.addClass("current-turn");
        }
        player.attr("data-money", Monopoly.moneyAtStart);
    }
};


Monopoly.getNextCell = function (cell) {
    var currentCellId = parseInt(cell.attr("id").replace("cell", ""));
    var nextCellId = currentCellId + 1
    if (nextCellId > 40) {
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};


Monopoly.handlePassedGo = function () {
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player, -1 * 15);
    //just changed multiplied value on negative number to get positive result.
};


Monopoly.isValidInput = function (value) {
    // Function that should validate input, "Monopoly.isValidInput" was written, incorrect. 
    //So I made new one, wher instead of broken switch case 
    //we have " if else statement", and only one parametr.
    if (value > 1 && value <= 4) {
        isValid = true;
    }
    else {
        Monopoly.showErrorMsg();
        var isValid = false;
    }
    return isValid;

}


Monopoly.showErrorMsg = function () { // defines speed of showing popUps
    $(".popup-page .invalid-error").fadeTo(500, 1);
    setTimeout(function () {
        $(".popup-page .invalid-error").fadeTo(500, 0);
    }, 2000);
};


Monopoly.adjustBoardSize = function () { // function that generates game board
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(), $(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) * 2;
    $(".board").css({ "height": boardSize, "width": boardSize });
}

Monopoly.closePopup = function () { //close popup function, function with different popups refer to it
    $(".popup-lightbox").fadeOut();
};

Monopoly.playSound = function (sound) {//sounds
    var snd = new Audio("./sounds/" + sound + ".wav");
    snd.play();
}

Monopoly.showPopup = function (popupId) {
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};

Monopoly.init();