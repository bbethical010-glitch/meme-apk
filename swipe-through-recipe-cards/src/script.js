"use strict";

//Random Number generator
function randomNumber(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

let tinderContainer = document.querySelector(".tinder");
let allCards = document.querySelectorAll(".tinder--card");
let currentCard;
const nope = document.getElementById("nope");
const love = document.getElementById("love");
let num = 5;

//create cards for page
function initCards(card, index) {
	//the cards that haven't been removed
	var newCards = document.querySelectorAll(".tinder--card:not(.removed)");

	newCards.forEach(function (card, index) {
		//put the card in front
		card.style.zIndex = allCards.length - index;
		//angle the card and make it smaller the further back it goes
		card.style.transform =
			"scale(" + (20 - index) / 20 + ") translateY(-" + 50 * index + "px)";
		//change how opaque it is depending where it is in the stack (index 0 is fully opaque). uses 5 so that anything loaded after 5 is fully transparent
		// card.style.opacity = (5 - index) / 5;
	});

	//give the ones that get initialized a "loaded" class
	tinderContainer.classList.add("loaded");
}

//run initialization
initCards();

function nodeToString(node) {
	var tmpNode = document.createElement("div");
	tmpNode.appendChild(node.cloneNode(true));
	var str = tmpNode.innerHTML;
	tmpNode = node = null; // prevent memory leaks in IE
	return str;
}

function cleanCurrentCard(thisCard) {
	let cleanedCard = nodeToString(thisCard)
		.replace(/(\r\n|\n|\r)/gm, "")
		.replace(" removed", "");
	return cleanedCard;
}

function removeRemoveClass() {
	var element = document.querySelector(".tinder--card");
	element.classList.remove("removed");
}

//my custom function
function addNewCard(thisCard) {
	console.log(thisCard);
	let cleanedCard = cleanCurrentCard(thisCard);

	//increment the number to be given to the card
	num++;

	//card area
	var allCardsArea = document.querySelector(".tinder--cards");

	//add a card to the end of the innerHTML
	setTimeout(function () {
		allCardsArea.innerHTML += cleanedCard;
		//remove the .removed ones
		const paras = document.getElementsByClassName("removed");
		while (paras[0]) {
			paras[0].parentNode.removeChild(paras[0]);
		}
		// removeRemoveClass();
	}, 300);

	//try to get newest card at back to fade in
	//ooor just add so many that the last one is completely transparent since the opacity changes by .10 each card

	//run these two after a delay that is slightly longer than the delay for adding the new card
	//this makes a new card at the back and then transitions it smoothly to the smaller size
	setTimeout(initCards, 301);
	setTimeout(addHammers, 301);
}

function addHammers() {
	//redefined to be able to reinitialize on new card add
	allCards = document.querySelectorAll(".tinder--card");

	allCards.forEach(function (el) {
		//initialize hammer on each card
		var hammertime = new Hammer(el);

		//add the moving class if the card is being panned
		hammertime.on("pan", function (event) {
			el.classList.add("moving");
		});

		//don't do anything if the movement hasn't changed
		hammertime.on("pan", function (event) {
			if (event.deltaX === 0) return;
			if (event.center.x === 0 && event.center.y === 0) return;

			//if it has been changed at all to the right, add the 'tinder-love' class
			tinderContainer.classList.toggle("tinder_love", event.deltaX > 0);
			//if it has been changed at all to the left, add the 'tinder-nope' class
			tinderContainer.classList.toggle("tinder_nope", event.deltaX < 0);

			//angle the further it goes right or left
			var xMulti = event.deltaX * 0.03;
			//angle the further it goes up or down
			var yMulti = event.deltaY / 80;

			//rotation is a combo of both
			var rotate = xMulti * yMulti;

			//apply the movement and rotation
			event.target.style.transform =
				"translate(" +
				event.deltaX +
				"px, " +
				event.deltaY +
				"px) rotate(" +
				rotate +
				"deg)";
		});

		//when you're done with the panning event
		hammertime.on("panend", function (event) {
			//remove the 'moving' class from the card
			el.classList.remove("moving");
			//remove the love and nope classes from the rest of the cards just in case something happened where they stayed
			tinderContainer.classList.remove("tinder_love");
			tinderContainer.classList.remove("tinder_nope");

			//set var for width of the body (including padding)
			var moveOutWidth = document.body.clientWidth;

			//determine if the card should be kept on screen. (Gotta be changed by a certain amount and be moving)
			var keep = Math.abs(event.deltaX) < 80 || Math.abs(event.velocityX) < 0.5;

			//toggle the removed class if the keep var has not evaluated to true
			event.target.classList.toggle("removed", !keep);

			//if the keep value evaluates true, set transform to nothing
			if (keep) {
				event.target.style.transform = "";
			} else {
				//if it's not being kept onscreen, move it on out
				//calculate all of the movements and whatnot
				var endX = Math.max(Math.abs(event.velocityX) * moveOutWidth, moveOutWidth);
				var toX = event.deltaX > 0 ? endX : -endX;
				var endY = Math.abs(event.velocityY) * moveOutWidth;
				var toY = event.deltaY > 0 ? endY : -endY;
				var xMulti = event.deltaX * 0.03;
				var yMulti = event.deltaY / 80;
				var rotate = xMulti * yMulti;

				event.target.style.transform =
					"translate(" +
					toX +
					"px, " +
					(toY + event.deltaY) +
					"px) rotate(" +
					rotate +
					"deg)";

				//add the card to the back
				addNewCard(event.target);
			}
		});
	});
}

//run the addHammers to allow card movement
addHammers();

//function for the love and hate buttons
function createButtonListener(love) {
	return function (event) {
		//if the card is not given the removed class
		var cards = document.querySelectorAll(".tinder--card:not(.removed)");

		//the body width (including padding) multiplied by 1.5
		var moveOutWidth = document.body.clientWidth * 1.5;

		//if there are no more cards, do nothing
		// if (!cards.length) return false;

		//only operate on the current card
		var card = cards[0];

		//add the removed class to the current card
		card.classList.add("removed");

		//if love (true) has been passed in,
		if (love) {
			//move the card right and rotate it
			card.style.transform =
				"translate(" + moveOutWidth + "px, -100px) rotate(-30deg)";
			//if nope (false) has been passed in,
		} else {
			//move the card left and rotate it
			card.style.transform =
				"translate(-" + moveOutWidth + "px, -100px) rotate(30deg)";
		}

		//intitialize cards again to determine the top card (and add a new one)
		addNewCard(card);

		//prevent the default action from happening for the button
		event.preventDefault();
	};
}

//create love and nope button listeners
var nopeListener = createButtonListener(false);
var loveListener = createButtonListener(true);

//add click events to love and nope buttons
nope.addEventListener("click", nopeListener);
love.addEventListener("click", loveListener);

document.querySelector(".closeMe").addEventListener("click", function () {
	toggleInfoClose(true);
});
document.querySelector(".covering").addEventListener("click", function () {
	toggleInfoClose(true);
});
document.querySelector("#info").addEventListener("click", function () {
	toggleInfoClose(false);
});

function toggleInfoClose(bool) {
	if (!bool) {
		document.querySelector(".tinder--info").style.top = "50%";
	} else {
		document.querySelector(".tinder--info").style.top = "200vh";
	}
}

//stuff to prompt the user to swipe
//Shows the animation if your mouse is still for 15 seconds/hides it when you move
let fadein = null;

const myFunction = (fadeOutTime, fadeInAfterTime) => {
	document.querySelector(".promptBox").style.transition = fadeOutTime + "ms";
	document.querySelector(".promptBox").style.opacity = "0";
	if (fadein != null) {
		clearTimeout(fadein);
	}
	fadein = setTimeout(showMe, fadeInAfterTime);
};

const showMe = () => {
	document.querySelector(".promptBox").style.opacity = "1";
};

document.querySelector("body").addEventListener("mousemove", function () {
	myFunction(300, 15000);
});
document.querySelector("body").addEventListener("click", function () {
	myFunction(300, 15000);
});
document.querySelector("body").addEventListener("touchstart", function () {
	myFunction(300, 15000);
});
document.querySelector("body").addEventListener("touchmove", function () {
	myFunction(300, 15000);
});
