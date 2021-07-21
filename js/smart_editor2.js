$(document).ready(function() {

	var bMenuClicked = false;

	/*  */
	$("#menuBar .title_panel").mouseover(function() {
		if (bMenuClicked) {
			$(this).siblings().removeClass("on");
			$(this).addClass("on");
		}
	});
	$("#menuBar .title_panel").click(function() {
		bMenuClicked = !bMenuClicked;
		if (bMenuClicked) 
			$(this).addClass("on");
		else
			$(this).removeClass("on");
	});
});