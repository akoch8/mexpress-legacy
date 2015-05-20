$(document).ready(function() {
    
    // horizonral scrolling for the banner (used when the content is wider than the screen)
    $(window).scroll(function() {
        
        $('header').css({
            'left': $(this).scrollLeft()
        });
        
    });
    
    // focus on the text input field
    $("input[type=text]").focus();
    
    // scroll 1px down and up in the sample selection list
    // this will show the scroll bar and indicate that the element is scrollable
    //$('.sampleSelectionList').scrollTop(1).scrollTop(0);
    //$('.sampleSelectionList').animate({scrollTop:100}, 200).animate({scrollTop:0}, 400);

    // set the width of the plot container
    windowWidth = $(window).width();
    inputWidth = $('.userInput').outerWidth();
    plotWidth = windowWidth - inputWidth - 28;
    $('.plotContainer').width(plotWidth);
    
});