function prepareSvgForDownload(gene, source, sorter) {
    
    // remove download buttons
    $(".downloadButton").remove();
    $(".downloadText").remove();
    // create a new download button
    $(".plotInfo p").append("<div class='download'></div>");
    $(".download").append("<div class='downloadButton png'>png</div>");
    $(".download").append("<div class='downloadButton svg'>svg</div>");
    $(".download").append("<div class='downloadText'>download a png or svg version of the figure</div>");
    // make the download button visible
    $(".downloadButton").css("visibility", "visible").hide().fadeIn(1000);
    
    $(".downloadButton").mouseenter(function() { $(".downloadText").css("visibility", "visible").hide().fadeIn(100); })
                        .mouseleave(function() { $(".downloadText").css("visibility", "hidden"); });
    
    $(".downloadButton.png").click(function(){
        
        var svgHtml = d3.select("svg")
                .attr("version", 1.1)
                .attr("xlmns", "http://www.w3.org/2000/svg")
                .node().parentNode.innerHTML;
        
        // replace the download text with a loading gif
        $(this).html("<img src='images/arrowLoader.gif'>");
        downloadSvg(gene, source, sorter, svgHtml, "png");
        
    });
    
    $(".downloadButton.svg").click(function(){
        
        var svgHtml = d3.select("svg")
                .attr("version", 1.1)
                .attr("xlmns", "http://www.w3.org/2000/svg")
                .node().parentNode.innerHTML;
        
        // replace the download text with a loading gif
        $(this).html("<img src='images/arrowLoader.gif'>");
        downloadSvg(gene, source, sorter, svgHtml, "svg");
        
    });
    
}

function createDownloadLink(imageLink, fileType) {
    
    // extract the png name from the link
    var imgName = imageLink.replace(/^.+\//, "");
    // download the image
    var a = document.createElement("a");
    a.class = "downloadLink";
    a.download = imgName;
    a.target = "_blank";
    a.href = imageLink;
    document.body.appendChild(a);
    a.click();
    if (fileType === "png") {
        $(".downloadButton.png").html("png");
    } else if (fileType === "svg") {
        $(".downloadButton.svg").html("svg");
    }
    
}

function downloadSvg(gene, source, sorter, svgHtml, fileType) {
    
    var encodedSvgHtml = encodeURIComponent(svgHtml);
    
    // get the probe id from the svg element with the class 'containsProbeId'
    // the probe id is used to create a unique file name for the image when a user has highlighted a probe
    var probe = $(".containsProbeId").attr("id");
    var probeId = "";
    if (probe !== undefined) {
        var probeId = probe.replace(/^.+?_/, "");
        probeId = probeId.replace(/_.+$/, "");
    }
    
    $.ajax({
        data: "fileType=" + fileType + "&gene=" + gene + "&source=" + source + "&sorter=" + sorter + "&probe=" + probeId + "&svgHtml=" + encodedSvgHtml,
        url: "php/svg2png.php",
        method: "POST",
        success: function(data) {
            var imageFileName = data;
            imageFileName = "php/" + imageFileName;
            createDownloadLink(imageFileName, fileType);
        }
    });
    
}