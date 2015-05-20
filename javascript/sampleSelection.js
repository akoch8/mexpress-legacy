$(document).ready(function() {
    
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