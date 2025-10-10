// Global variables for window management
let windowZIndex = 100;
let activeWindowId = null;
let isDragging = false;
let isResizing = false;
let currentWindow = null;
let dragOffset = { x: 0, y: 0 };
let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

// Function to add a window to the taskbar
function addToTaskbar(window, title) {
    console.log("Adding to taskbar:", title);

    const windowId = window.attr("id");
    console.log("Window ID:", windowId);

    // Check if already in taskbar
    if ($(`#taskbar-item-${windowId}`).length > 0) {
        console.log("Window already in taskbar, making active");
        // Just make it active if already exists
        $(".taskbar-item").removeClass("active");
        $(`#taskbar-item-${windowId}`).addClass("active");
        return;
    }

    // Get the icon from the window's title bar
    const iconSrc = window.find('.title-bar img').attr('src') || 'Icons/computer.ico';
    console.log("Icon source:", iconSrc);

    // Force task-band to be visible with explicit styles
    const taskBand = $("#task-band");
    taskBand.css({
        "display": "flex !important",
        "flex-grow": "1 !important",
        "align-items": "center !important",
        "padding": "0 5px !important",
        "position": "relative !important",
        "z-index": "1 !important"
    });

    // Create taskbar item with comprehensive inline styles
    const taskbarItem = $(`
    <div id="taskbar-item-${windowId}" class="taskbar-item" data-window-id="${windowId}" 
         style="display: flex !important; 
                align-items: center !important; 
                padding: 2px 5px !important; 
                margin-right: 2px !important; 
                background-color: rgba(90, 183, 212, 0.34) !important; 
                border: none !important;
                cursor: pointer !important; 
                height: 22px !important; 
                min-width: 180px !important; 
                max-width: 300px !important;
                position: relative !important;
                z-index: 2 !important;
                font-family: 'Tahoma', sans-serif !important;
                font-size: 11px !important;
                color: white !important;
                ">
        <div class="taskbar-icon" style="margin-right: 5px !important; display: flex !important; align-items: center !important;">
            <img src="${iconSrc}" width="16" height="16" style="image-rendering: pixelated !important;">
        </div>
        <div class="taskbar-text" style="white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; flex-grow: 1 !important;">${title}</div>
    </div>
`);

    // Add click handler
    taskbarItem.on("click", function () {
        console.log("Taskbar item clicked");
        const targetWindow = $(`#${windowId}`);
        if (targetWindow.is(":visible")) {
            // If window is visible, minimize it
            targetWindow.hide();
            $(this).removeClass("active");
        } else {
            // If window is hidden, restore it
            targetWindow.show();
            bringToFront(targetWindow);
            $(this).addClass("active");
        }
    });

    // Check if task-band exists
    console.log("Task band element:", taskBand.length > 0 ? "Found" : "Not found");

    if (taskBand.length === 0) {
        console.error("Task band element not found!");
        return;
    }

    // Add to taskbar
    taskBand.append(taskbarItem);
    console.log("Taskbar item added to DOM");

    // Force visibility with a timeout to ensure DOM is updated
    setTimeout(function () {
        taskbarItem.css({
            "display": "flex !important",
            "visibility": "visible !important",
            "opacity": "1 !important"
        });
        console.log("Forced taskbar item visibility");
    }, 10);

    // Mark as active
    taskbarItem.addClass("active");
    console.log("Taskbar item marked as active");

    // Log the final HTML for debugging
    console.log("Task band HTML:", taskBand.html());
}

// Function to remove a window from the taskbar
function removeFromTaskbar(windowId) {
    console.log("Removing from taskbar:", windowId);
    $(`#taskbar-item-${windowId}`).remove();
}

// Function to bring window to front
function bringToFront(window) {
    console.log("Bringing window to front");
    // Increment z-index and apply to window
    windowZIndex++;
    window.css("z-index", windowZIndex);

    // Update taskbar item
    const windowId = window.attr("id");
    $(".taskbar-item").removeClass("active");
    $(`#taskbar-item-${windowId}`).addClass("active");

    // Update active window ID
    activeWindowId = windowId;
}

// Function to open a window and add it to taskbar
function openWindow(window, title) {
    console.log("Opening window:", title);
    window.show();
    bringToFront(window);
    addToTaskbar(window, title);

    // Update address bar
    if (window.attr("id") === "my-computer-window") {
        $("#address-bar").text("My Computer");
    }
}

// Function to make a window interactive (draggable, resizable, and controllable)
function makeWindowInteractive(windowElement) {
    // Remove any existing handlers to prevent duplicates
    windowElement.find('.title-bar').off('mousedown.drag');
    windowElement.find('.resize-handle').off('mousedown.resize');
    windowElement.find('.title-bar-controls button').off('click.control');
    
    // Add drag handler to title bar
    windowElement.find('.title-bar').on('mousedown.drag', function (e) {
        if ($(e.target).is("button")) return;

        isDragging = true;
        currentWindow = $(this).closest(".window");

        // Don't allow dragging maximized windows
        if (currentWindow.hasClass("maximized")) return;

        const windowPos = currentWindow.offset();
        dragOffset.x = e.pageX - windowPos.left;
        dragOffset.y = e.pageY - windowPos.top;

        bringToFront(currentWindow);
        e.preventDefault();
    });

    // Add resize handler to resize handle
    windowElement.find('.resize-handle').on('mousedown.resize', function (e) {
        e.stopPropagation();

        // Don't allow resizing maximized windows
        const window = $(this).closest(".window");
        if (window.hasClass("maximized")) return;

        isResizing = true;
        currentWindow = window;
        resizeStart.x = e.pageX;
        resizeStart.y = e.pageY;
        resizeStart.width = currentWindow.width();
        resizeStart.height = currentWindow.height();

        bringToFront(currentWindow);
        e.preventDefault();
    });

    // Add control button handlers
    windowElement.find('.title-bar-controls button[aria-label="Close"]').on('click.control', function () {
        const window = $(this).closest(".window");
        const windowId = window.attr("id");
        window.hide();
        removeFromTaskbar(windowId);
    });

    windowElement.find('.title-bar-controls button[aria-label="Minimize"]').on('click.control', function () {
        const window = $(this).closest(".window");
        const windowId = window.attr("id");
        window.hide();
        $(`#taskbar-item-${windowId}`).removeClass("active");
    });

    windowElement.find('.title-bar-controls button[aria-label="Maximize"]').on('click.control', function () {
        const window = $(this).closest(".window");
        const isMaximized = window.hasClass("maximized");

        if (isMaximized) {
            // Restore window
            window.removeClass("maximized");
            window.css({
                width: window.data("original-width") || "600px",
                height: window.data("original-height") || "400px",
                top: window.data("original-top") || "50px",
                left: window.data("original-left") || "100px"
            });
        } else {
            // Maximize window
            window.data("original-width", window.width());
            window.data("original-height", window.height());
            window.data("original-top", window.css("top"));
            window.data("original-left", window.css("left"));

            window.addClass("maximized");
            window.css({
                width: "calc(100% - 1px)",
                height: "calc(100% - 32px)",
                top: "0px",
                left: "0px"
            });
        }

        bringToFront(window);
    });
}

// Function to toggle sidebar sections
function toggleSection(header) {
    const content = header.nextElementSibling;
    const isCollapsed = content.classList.contains('collapsed');

    if (isCollapsed) {
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
    } else {
        content.classList.add('collapsed');
        header.classList.add('collapsed');
    }
}

// Initialize all functionality when document is ready
 $(document).ready(function () {
    console.log("Document ready, initializing...");

    // Check if taskbar elements exist
    console.log("Taskbar element:", $("#taskbar").length > 0 ? "Found" : "Not found");
    console.log("Task band element:", $("#task-band").length > 0 ? "Found" : "Not found");

    // Force taskbar to be visible
    $("#taskbar").css({
        "display": "flex !important",
        "position": "fixed !important",
        "bottom": "0 !important",
        "left": "0 !important",
        "width": "100% !important",
        "height": "30px !important",
        "z-index": "9999 !important"
    });

    // Force task-band to be visible
    $("#task-band").css({
        "display": "flex !important",
        "flex-grow": "1 !important",
        "align-items": "center !important",
        "padding": "0 5px !important",
        "position": "relative !important",
        "z-index": "1 !important",
        "background-color": "rgba(0, 100, 200, 0.3) !important"  // Temporary background for debugging
    });

    // Global mouse move handler for dragging
    $(document).on('mousemove', function (e) {
        if (isDragging && currentWindow) {
            currentWindow.css({
                left: (e.pageX - dragOffset.x) + "px",
                top: (e.pageY - dragOffset.y) + "px"
            });
        }

        if (isResizing && currentWindow) {
            const newWidth = resizeStart.width + (e.pageX - resizeStart.x);
            const newHeight = resizeStart.height + (e.pageY - resizeStart.y);

            currentWindow.css({
                width: Math.max(300, newWidth) + "px",
                height: Math.max(250, newHeight) + "px"
            });
        }
    });

    // Global mouse up handler
    $(document).on('mouseup', function () {
        isDragging = false;
        isResizing = false;
        currentWindow = null;
    });

    // Start button interactions
    $("#start-button").on("mouseenter", function () {
        $(this).addClass("hover");
    });

    $("#start-button").on("mouseleave", function () {
        $(this).removeClass("hover");
    });

    $("#start-button").on("click", function () {
        $(this).toggleClass("pressed");
    });

    // Desktop icon interactions
    $(".desktop-icon").on("click", function (e) {
        $(".desktop-icon").removeClass("selected");
        $(this).addClass("selected");
    });

    $("#desktop").on("click", function (e) {
        if (e.target === this) {
            $(".desktop-icon").removeClass("selected");
        }
    });

    $(".desktop-icon").on("dblclick", function () {
        const iconName = $(this).find(".label").text();
        console.log("Double clicked on:", iconName);
        if (iconName === "My Computer") {
            openWindow($("#my-computer-window"), "My Computer");
        }
    });

    // Initialize all existing windows as interactive
    $(".window").each(function() {
        makeWindowInteractive($(this));
    });

    // Initialize all sections as expanded
    const sections = document.querySelectorAll('.sidebar-section');
    sections.forEach(section => {
        const header = section.querySelector('.sidebar-header');
        const content = section.querySelector('.sidebar-content');
        header.classList.remove('collapsed');
        content.classList.remove('collapsed');
    });

    // Handle folder click for Project 1
    $('.Folder').on('click', function (e) {
        $('.Folder').removeClass('selected');
        $(this).addClass('selected');

        const folderName = $(this).find('span').text();
        if (folderName === 'Project 1') {
            showUploadDialog();
        }
    });

    // Function to show upload dialog
    function showUploadDialog() {
        // Calculate position to center the dialog on screen
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        const dialogWidth = 400;
        const dialogHeight = 200;

        const left = (windowWidth - dialogWidth) / 2;
        const top = (windowHeight - dialogHeight) / 2;

        // Reset dialog state
        $('#upload-dialog #file-name').text('No file selected');
        $('#upload-dialog #file-input').val('');
        $('#upload-dialog #upload-button').text('Upload').prop('disabled', true);
        $('#upload-dialog .upload-progress').hide();

        // Set position and show the dialog
        $('#upload-dialog').css({
            left: left + "px",
            top: top + "px"
        }).show();

        // Add to taskbar
        addToTaskbar($("#upload-dialog"), "Upload File");
        bringToFront($("#upload-dialog"));
    }

    // Handle file selection
    $('#file-select-button').on('click', function () {
        $('#file-input').click();
    });

    $('#file-input').on('change', function () {
        const fileName = $(this).val().split('\\').pop();
        if (fileName) {
            $('#file-name').text(fileName);
            $('#upload-button').prop('disabled', false);
        } else {
            $('#file-name').text('No file selected');
            $('#upload-button').prop('disabled', true);
        }
    });

    // Handle upload button click
    $('#upload-button').on('click', function () {
        const fileName = $('#file-name').text();
        if (fileName !== 'No file selected') {
            // Show progress animation
            $('.upload-progress').show();
            $(this).prop('disabled', true);

            // Reset all boxes to hidden
            $('.progress-box').removeClass('visible');

            // Show boxes one by one
            let currentBox = 0;
            const totalBoxes = $('.progress-box').length;
            const intervalTime = 200; // Time between each box appearing (in milliseconds)

            const showNextBox = setInterval(function () {
                if (currentBox < totalBoxes) {
                    $('.progress-box').eq(currentBox).addClass('visible');
                    currentBox++;
                } else {
                    clearInterval(showNextBox);

                    // Hide progress animation after a short delay
                    setTimeout(function () {
                        $('.upload-progress').hide();

                        // Change button to "Analyze"
                        $('#upload-button').text('Analyze').prop('disabled', false);

                        // Show success message
                        $('.upload-message p').text(`File "${fileName}" uploaded successfully! Click "Analyze" to process the file.`);
                    }, 500);
                }
            }, intervalTime);
        }
    });

    // Handle analyze button click
    $('#upload-button').on('click', function () {
        if ($(this).text() === 'Analyze') {
            // Show analysis progress
            $('.upload-progress').show();
            $('.upload-message p').text('Analyzing file...');
            $(this).prop('disabled', true);

            // Create FormData to send the file
            const formData = new FormData();
            const fileInput = document.getElementById('file-input');
            formData.append('file', fileInput.files[0]);

            // Send the file to Flask app
            $.ajax({
                url: '/analyze',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    // Hide progress animation
                    $('.upload-progress').hide();

                    // Hide upload dialog
                    $('#upload-dialog').hide();
                    removeFromTaskbar("upload-dialog");

                    // Update the folder content with new files
                    updateFolderContent(response);

                    // Automatically open the analysis files
                    setTimeout(function () {
                        openAnalysisFiles(response);
                    }, 500);
                },
                error: function (xhr, status, error) {
                    // Hide progress animation
                    $('.upload-progress').hide();

                    // Show error message
                    $('.upload-message p').text('Error: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));

                    // Reset button
                    $('#upload-button').text('Upload').prop('disabled', false);
                }
            });
        }
    });

    // Function to update folder content with analysis results
    function updateFolderContent(data) {
        // Clear existing content
        $('.content-items').empty();

        // Add the analysis files - using existing icons as fallbacks
        const analysisFile = $(`
    <div class="Folder analysis-file" data-type="text">
        <img src="/static/Icons/text.ico">
        <span>analysis.txt</span>
    </div>
`);

        const pmfFile = $(`
    <div class="Folder analysis-file" data-type="image">
        <img src="/static/Icons/image-file.ico">
        <span>pmf.png</span>
    </div>
`);

        $('.content-items').append(analysisFile);
        $('.content-items').append(pmfFile);

        // Store the analysis data for later use
        window.analysisData = data;

        // Add click handlers for the new files
        $('.analysis-file').on('click', function () {
            $('.Folder').removeClass('selected');
            $(this).addClass('selected');
        });

        $('.analysis-file').on('dblclick', function () {
            const fileType = $(this).data('type');
            if (fileType === 'text') {
                openTextFile();
            } else if (fileType === 'image') {
                openImageFile();
            }
        });
    }

    // Function to open analysis files automatically
    function openAnalysisFiles(data) {
        // First, open the text file
        openTextFile();

        // Then, open the image file after a short delay
        setTimeout(function () {
            openImageFile();
        }, 300);
    }

    // Function to open the text file
    function openTextFile() {
        // Create a text file window
        const textWindow = $(`
    <div id="text-file-window" class="window"
        style="display: none; width: 600px; height: 400px; top: 80px; left: 150px; position: absolute; z-index: 100; margin-top: -20px; margin-left: -40px;">
        <div class="title-bar">
            <img src="/static/Icons/text.ico" width="20px">
            <div class="title-bar-text">analysis.txt</div>
            <div class="title-bar-controls">
                <button aria-label="Minimize"></button>
                <button aria-label="Maximize"></button>
                <button aria-label="Close"></button>
            </div>
        </div>
        <div class="window-body">
            <div class="text-content">
                <pre>${formatAnalysisData(window.analysisData)}</pre>
            </div>
        </div>
        <div class="resize-handle"></div>
    </div>
`);

        // Add to the page
        $('body').append(textWindow);

        // Make the window interactive
        makeWindowInteractive(textWindow);

        // Show the window
        openWindow(textWindow, "analysis.txt");
    }

    // Function to open the image file
    function openImageFile() {
        // Create an image window
        const imageWindow = $(`
    <div id="image-file-window" class="window"
        style="display: none; width: 650px; height: 500px; top: 120px; left: 200px; position: absolute; z-index: 100;">
        <div class="title-bar">
            <img src="/static/Icons/image-file.ico" width="20px">
            <div class="title-bar-text">pmf.png</div>
            <div class="title-bar-controls">
                <button aria-label="Minimize"></button>
                <button aria-label="Maximize"></button>
                <button aria-label="Close"></button>
            </div>
        </div>
        <div class="window-body">
            <div class="image-content">
                <canvas id="pmf-canvas" width="600" height="400"></canvas>
            </div>
        </div>
        <div class="resize-handle"></div>
    </div>
`);

        // Add to the page
        $('body').append(imageWindow);

        // Make the window interactive
        makeWindowInteractive(imageWindow);

        // Show the window
        openWindow(imageWindow, "pmf.png");

        // Draw the PMF chart
        setTimeout(function () {
            drawPMFChart(window.analysisData.pmf);
        }, 100);
    }

    // Function to format analysis data for display
    function formatAnalysisData(data) {
        let text = "Information Theory and Coding Analysis Results\n";
        text += "=============================================\n\n";

        text += "Entropy Measurements:\n";
        text += "---------------------\n";
        text += `Entropy: ${data.entropy.toFixed(4)} bits per character\n`;
        text += `Relative Entropy: ${data.relative_entropy.toFixed(4)} bits\n`;
        text += `Joint Entropy: ${data.joint_entropy.toFixed(4)} bits\n`;
        text += `Conditional Entropy: ${data.conditional_entropy.toFixed(4)} bits\n\n`;

        text += "Chain Rule Verification:\n";
        text += "------------------------\n";
        text += `H(X,Y) = H(X) + H(Y|X): ${data.verification ? 'Verified' : 'Not verified'}\n\n`;

        text += "Text Analysis:\n";
        text += "--------------\n";
        text += `Original Text Length: ${data.original_length} characters\n`;
        text += `Decoded Text Length: ${data.decoded_length} characters\n\n`;

        text += "Decoded Text Sample:\n";
        text += "--------------------\n";
        text += data.decoded_text + "\n\n";

        text += "Probability Mass Function:\n";
        text += "--------------------------\n";

        // Sort characters by probability
        const sortedPMF = Object.entries(data.pmf).sort((a, b) => b[1] - a[1]);

        sortedPMF.forEach(([char, prob]) => {
            const displayChar = char === ' ' ? 'Space' : char;
            text += `${displayChar}: ${prob.toFixed(6)}\n`;
        });

        return text;
    }

    // Function to draw the PMF chart on canvas
    function drawPMFChart(pmf) {
        const canvas = document.getElementById('pmf-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Sort characters by probability
        const sortedPMF = Object.entries(pmf).sort((a, b) => b[1] - a[1]);

        // Chart dimensions
        const padding = 40;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        const barWidth = Math.min(chartWidth / sortedPMF.length - 2, 30);

        // Find max probability for scaling
        const maxProb = Math.max(...sortedPMF.map(([_, prob]) => prob));

        // Draw axes
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();

        // Draw title
        ctx.font = 'bold 14px Tahoma';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText('Probability Mass Function', canvas.width / 2, 20);

        // Draw bars
        sortedPMF.forEach(([char, prob], index) => {
            const barHeight = (prob / maxProb) * chartHeight;
            const x = padding + index * (barWidth + 2) + 5;
            const y = canvas.height - padding - barHeight;

            // Draw bar
            ctx.fillStyle = '#3a6ea5';
            ctx.fillRect(x, y, barWidth, barHeight);

            // Draw label
            ctx.save();
            ctx.translate(x + barWidth / 2, canvas.height - padding + 15);
            ctx.rotate(-Math.PI / 4);
            ctx.font = '10px Tahoma';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'right';
            ctx.fillText(char === ' ' ? 'Space' : char, 0, 0);
            ctx.restore();

            // Draw probability value
            ctx.font = '9px Tahoma';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.fillText(prob.toFixed(3), x + barWidth / 2, y - 5);
        });

        // Draw axis labels
        ctx.font = '12px Tahoma';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText('Character', canvas.width / 2, canvas.height - 5);

        ctx.save();
        ctx.translate(15, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Probability', 0, 0);
        ctx.restore();
    }

    // Handle cancel button click
    $('#cancel-button').on('click', function () {
        $('#upload-dialog').hide();
        removeFromTaskbar("upload-dialog");
    });

    // Handle close button
    $('#upload-dialog .title-bar-controls button[aria-label="Close"]').on("click", function () {
        $('#upload-dialog').hide();
        removeFromTaskbar("upload-dialog");
    });

    // Handle folder double click
    $('.Folder').on('dblclick', function () {
        const folderName = $(this).find('span').text();
        // Update address bar with folder path
        $("#address-bar").text(`My Computer\\${folderName}`);
    });

    // Handle right-click on folders
    $('.Folder').on('contextmenu', function (e) {
        e.preventDefault();

        // Show context menu at mouse position
        const contextMenu = $('#context-menu');
        contextMenu.css({
            display: 'block',
            left: e.pageX,
            top: e.pageY
        });

        // Store reference to the clicked folder
        contextMenu.data('targetFolder', $(this));

        return false;
    });

    // Hide context menu when clicking elsewhere
    $(document).on('click', function () {
        $('#context-menu').hide();
    });

    // Handle context menu item clicks
    $('.context-menu-item').on('click', function () {
        const action = $(this).data('action');
        const targetFolder = $('#context-menu').data('targetFolder');
        const folderName = targetFolder.find('span').text();

        if (action === 'open') {
            // Update address bar with folder path
            $("#address-bar").text(`My Computer\\${folderName}`);
            alert(`Opening folder: ${folderName}`);
        } else if (action === 'properties') {
            showPropertiesDialog(folderName);
        }

        $('#context-menu').hide();
    });

    // Function to show properties dialog
    function showPropertiesDialog(folderName) {
        // Update the title with the folder name
        $('#properties-dialog .title-bar-text').text(`${folderName} Properties`);

        // Calculate position to center the dialog on screen
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        const dialogWidth = 500;
        const dialogHeight = 450;

        const left = (windowWidth - dialogWidth) / 2;
        const top = (windowHeight - dialogHeight) / 2;

        // Set position and show the dialog
        $('#properties-dialog').css({
            left: left + "px",
            top: top + "px"
        }).show();

        // Add to taskbar
        addToTaskbar($("#properties-dialog"), `${folderName} Properties`);
        bringToFront($("#properties-dialog"));
    }

    // Handle tab switching
    $('.tab').on('click', function () {
        const tabId = $(this).data('tab');

        // Update active tab
        $('.tab').removeClass('active');
        $(this).addClass('active');

        // Update active tab pane
        $('.tab-pane').removeClass('active');
        $(`#${tabId}-tab`).addClass('active');
    });

    // Handle properties dialog buttons
    $('#properties-dialog .xp-button').on('click', function () {
        const buttonText = $(this).text();
        if (buttonText === 'OK' || buttonText === 'Cancel') {
            $('#properties-dialog').hide();
            removeFromTaskbar("properties-dialog");
        }
        // Apply button would save changes but not close
    });

    console.log("Initialization complete");
});