$(function() {
    
    // horizonral scrolling for the banner (used when the content is wider than the screen)
    $(window).scroll(function() {
        
        $('header').css({
            'left': $(this).scrollLeft()
        });
        
    });
    
    // focus on the text input field
    $("input[type=text]").focus();

    // set the width of the plot container
    windowWidth = $(window).width();
    inputWidth = $('.userInput').outerWidth();
    plotWidth = windowWidth - inputWidth - 28;
    $('.plotContainer').width(plotWidth);

    // autocomplete functionality
    var options, a;
    $(function(){
        
        options = {
            serviceUrl:'php/autocomplete.php',
            minChars:1,
            maxHeight:200,
            deferResquestBy:0
        };
        a = $('#gene').autocomplete(options);
        
    });

    // sample selection
    $(".sampleSelectionElement").click(function() {
        
        var clickedElement = $(this);
        // remove the selected class for every selected element
        $(".sampleSelectionElement").each(function() {
            
            if ($(this).hasClass("selectedSample")) {
                $(this).toggleClass("selectedSample");
            }
            
        });
        clickedElement.toggleClass("selectedSample");
        
    });
    
});