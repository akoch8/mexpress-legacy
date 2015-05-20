$(document).ready(function(){
   
    var options, a;
    jQuery(function(){
        
        options = {
            serviceUrl:'php/autocomplete.php',
            minChars:1,
            maxHeight:200,
            deferResquestBy:0
        };
        a = $('#gene').autocomplete(options);
        
    });
    
});