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

    $("#computer-icon").on("dblclick", function () {
        // Reset My Computer content to default when opening
        $('#my-computer-window .content-items').empty();
        $('.section-title').show();

        $('#my-computer-window .content-items').append(`
            <div class="Folder">
                <img src="/static/Icons/HardDrive.ico">
                <span>Project 1</span>
            </div>
        `);

        // Re-attach the click handler for Project 1
        $('.Folder').on('click', function (e) {
            $('.Folder').removeClass('selected');
            $(this).addClass('selected');

            const folderName = $(this).find('span').text();
            if (folderName === 'Project 1') {
                showUploadDialog();
            }
        });

        openWindow($("#my-computer-window"), "My Computer");
    });


    // Initialize all existing windows as interactive
    $(".window").each(function () {
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
            const intervalTime = 150;

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
                    $('.section-title').hide();

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

    function updateFolderContent(data) {
        // Clear existing content ONLY from My Computer window
        $('#my-computer-window .content-items').empty();

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

        // Add to My Computer window only
        $('#my-computer-window .content-items').append(analysisFile);
        $('#my-computer-window .content-items').append(pmfFile);

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
    // Function to format analysis data for display
    function formatAnalysisData(data) {
        let text = "Information Theory and Coding Analysis Results\n";
        text += "=============================================\n\n";

        text += "1. Probability Mass Function (PMF):\n";
        text += "-----------------------------------\n";

        // Sort characters by probability
        const sortedPMF = Object.entries(data.pmf).sort((a, b) => b[1] - a[1]);

        sortedPMF.forEach(([char, prob]) => {
            const displayChar = char === ' ' ? 'Space' : char;
            text += `${displayChar}: ${prob.toFixed(6)}\n`;
        });

        text += "\n2. Entropy Measurements:\n";
        text += "------------------------\n";
        text += `Entropy H(X): ${data.entropy.toFixed(4)} bits per character\n`;
        text += `Relative Entropy: ${data.relative_entropy.toFixed(4)} bits\n`;
        text += `Joint Entropy H(X,Y): ${data.joint_entropy.toFixed(4)} bits\n`;
        text += `Conditional Entropy H(Y|X): ${data.conditional_entropy.toFixed(4)} bits\n\n`;

        text += "3. Chain Rule Verification:\n";
        text += "---------------------------\n";
        text += `H(X,Y) = H(X) + H(Y|X)\n`;
        text += `${data.joint_entropy.toFixed(4)} = ${data.entropy.toFixed(4)} + ${data.conditional_entropy.toFixed(4)}\n`;
        text += `${data.joint_entropy.toFixed(4)} = ${(data.entropy + data.conditional_entropy).toFixed(4)}\n`;
        text += `Verification: ${data.verification ? 'VERIFIED ✓' : 'NOT VERIFIED ✗'}\n\n`;

        text += "4. Text Analysis:\n";
        text += "-----------------\n";
        text += `Original Text (X) Length: ${data.original_length} characters\n`;
        text += `Encoded Bits (X coded) Length: ${data.encoded_length} bits\n`;
        text += `Decoded Text (Y) Length: ${data.decoded_length} characters\n`;
        text += `Number of Bit Errors: ${data.num_errors}\n`;
        text += `Error Rate: ${data.error_rate.toFixed(2)}%\n\n`;

        text += "5. Original Text (X):\n";
        text += "--------------------\n";
        text += data.original_text + "\n\n";

        text += "6. Encoded Bits (X coded):\n";
        text += "-------------------------\n";
        text += data.encoded_bits + "\n\n";

        text += "7. Decoded Text (Y):\n";
        text += "-------------------\n";
        text += data.decoded_text + "\n\n";

        text += "8. Channel Analysis:\n";
        text += "--------------------\n";
        text += `Channel Type: Binary Symmetric Channel\n`;
        text += `Error Probability: 0.05 (5%)\n`;
        text += `Bits per Character: 6\n\n`;

        text += "9. Verification Details:\n";
        text += "------------------------\n";
        text += `Left Side (H(X,Y)): ${data.chain_rule_lhs.toFixed(6)} bits\n`;
        text += `Right Side (H(X) + H(Y|X)): ${data.chain_rule_rhs.toFixed(6)} bits\n`;
        text += `Difference: ${Math.abs(data.chain_rule_lhs - data.chain_rule_rhs).toFixed(6)} bits\n`;
        text += `Verification: ${data.verification ? 'VERIFIED ✓' : 'NOT VERIFIED ✗'}\n`;

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

// Person data
const personData = {
    "ahmed-mohamed-ahmed": {
        name: "Ahmed Mohamed Ahmed",
        id: "202200977",
        email: "amfares131217@gmail.com",
        phone: "+201064530052",
        education: [
            {
                degree: "Bachelor's degree in Communication and Information",
                field: "Communication and Information Engineering",
                institution: "University of Science, Technology and Innovation in Zewail City",
                year: "2022-2027"
            }
        ],
        skills: [
            "Python",
            "C++",
            "C#",
            "Dart",
            "JavaScript",
            "ASP.NET",
            "Flask",
            "Flutter",
            "HTML/CSS",
            "SQL",
            "Git/GitHub",
            "MATLAB Engine API",
            "NGROK",
            "MS SQL Server",
            "Code.org",
            "pywidevine"
        ],
        experience: [
            {
                position: "Demi Summer Instructor",
                company: "Demi",
                period: "June 2024 - September 2024",
                description: "Taught 5th grade students basic programming and artificial intelligence concepts using block programming"
            },
            {
                position: "Demi 2nd Intake Instructor",
                company: "Demi",
                period: "October 2024 - December 2024",
                description: "Taught 4th and 5th grade basic programming concepts for mobile applications development using Code.org"
            }
        ],
        projects: [
            {
                name: "Academic Planner",
                description: "Website built with ASP.NET with user-friendly interface and MS SQL database to help students manage their academic plans"
            },
            {
                name: "Prop App",
                description: "Flutter project that bridges MATLAB with Flutter using a Flask server and MATLAB engine API, tunneled by NGROK"
            },
            {
                name: "Brick Breaker",
                description: "Classic Brick Breaker game developed with C++ and CMU Graphics Library using Object Oriented Programming"
            },
            {
                name: "Decipher",
                description: "Python-based tool for video content decryption using pywidevine library to handle Widevine-encrypted streams"
            }
        ],
        extracurricular: [
            {
                position: "Head of Application Development Committee",
                organization: "Google Developer Student Club at Zewail City",
                period: "September 2023 - May 2024",
                description: "Mentored team members, organized workshops, conducted online sessions, prepared curriculum and materials"
            }
        ],
        softSkills: [
            "Leadership",
            "Team Mentoring",
            "Project Management",
            "Public Speaking",
            "Curriculum Design",
            "Technical Writing"
        ],
        languages: [
            { language: "English", level: "B2" },
            { language: "Arabic", level: "Native Speaker" }
        ]
    },
    "ahmed-mohamed-nasr": {
        name: "Ahmed Mohamed Elsaid",
        id: "20205678",
        email: "s-ahmed.nasr@zewailcity.edu.eg",
        phone: "+20 1004639700",
        education: [
            {
                degree: "Bachelor of Engineering",
                field: "Communication and Information Engineering",
                institution: "University of Science and Technology (UST), Zewail City",
                year: "2022-Present"
            }
        ],
        skills: [
            "Object-Oriented Programming",
            "Python (pandas, matplotlib)",
            "MATLAB",
            "C++/C#",
            "HTML/CSS",
            ".NET",
            "SQL",
            "Azure",
            "Seaborn",
            "NumPy",
            "SciPy",
            "Machine Learning",
            "Data Engineering"
        ],
        experience: [
            {
                position: "Microsoft Data Engineering Trainee",
                company: "Digital Egypt Pioneer",
                period: "June 2023 - November 2023",
                description: "Implemented ETL solutions, analyzed data using Python libraries, and developed machine learning models"
            }
        ],
        teachingExperience: [
            {
                position: "JTA (Junior Teaching Assistant)",
                institution: "University of Science and Technology, Zewail City",
                period: "September 2023 - February 2024",
                description: "Assisted with course delivery, examinations' monitoring, and supported students in understanding core computer science concepts"
            }
        ],
        projects: [
            {
                name: "DEPI Final Project",
                description: "Developed a program integrating Random Forest for price prediction and K-Means for customer segmentation",
                link: "https://github.com/AhmedNasr5804/Depi_project"
            },
            {
                name: "Random Variable Analysis",
                description: "Flutter project that bridges MATLAB with Flutter using a Flask server and MATLAB engine API"
            },
            {
                name: "Brick Breaker",
                description: "Classic Brick Breaker game developed with C++ and CMU Graphics Library using Object Oriented Programming"
            },
            {
                name: "OS Process Scheduler and Memory Management System",
                description: "Simulation in C on Manjaro Linux to schedule processes using RR, SJF, and HPF algorithms"
            },
            {
                name: "3-Bit Arithmetic and Logic Unit (ALU)",
                description: "ALU capable of performing various arithmetic and logical operations with overflow, carry, zero, and negative flags"
            }
        ],
        extracurricular: [
            {
                position: "Member",
                organization: "Data Science Team at Google Developer Club, Zewail City",
                period: "September 2023 - Present",
                description: "Contributed to organizing events and data science competitions, collaborated in competitions, and mentored newcomers"
            }
        ],
        courses: [
            {
                name: "Neural Networks and Deep Learning",
                provider: "Coursera | DeepLearning.AI",
                period: "September 2023",
                duration: "24 hours"
            },
            {
                name: "Improving Deep Neural Networks: Hyperparameter Tuning, Regularization and Optimization",
                provider: "Coursera | DeepLearning.AI",
                period: "September 2023",
                duration: "23 hours"
            },
            {
                name: "Databases and SQL for Data Science with Python",
                provider: "Coursera | IBM",
                period: "September 2022",
                duration: "20 hours"
            }
        ],
        softSkills: [
            "Time Management",
            "Leadership",
            "Communication Skills",
            "Project Management"
        ],
        languages: [
            { language: "English", level: "C2" },
            { language: "Arabic", level: "Native Speaker" }
        ]
    },
    "abdelhady": {
        name: "Abdelhady Mohamed",
        id: "20209012",
        email: "abdelhady@university.edu",
        phone: "+20 555 123 4567",
        education: [
            {
                degree: "Bachelor of Engineering",
                field: "Communication & Information Engineering",
                institution: "University of Science, Technology and Innovation at zewail city",
                year: "2022-2027"
            }
        ],
        skills: [
            "MATLAB",
            "Signal Processing",
            "Information Theory",
            "Data Compression",
            "Cryptography"
        ],
        experience: [
            {
                position: "Research Assistant",
                company: "Information Theory Lab",
                period: "2022-Present",
                description: "Conducted research on data compression algorithms"
            }
        ]
    }
};

// Function to show person properties dialog
function showPersonPropertiesDialog(personId) {
    const person = personData[personId];
    if (!person) return;

    // Update the title with the person's name
    $('#person-properties-dialog .title-bar-text').text(`${person.name} Properties`);

    // Calculate position to center the dialog on screen
    const windowWidth = $(window).width();
    const windowHeight = $(window).height();
    const dialogWidth = 500;
    const dialogHeight = 450;

    const left = (windowWidth - dialogWidth) / 2;
    const top = (windowHeight - dialogHeight) / 2;

    // Set position and show the dialog
    $('#person-properties-dialog').css({
        left: left + "px",
        top: top + "px"
    }).show();

    // Add to taskbar
    addToTaskbar($("#person-properties-dialog"), `${person.name} Properties`);
    bringToFront($("#person-properties-dialog"));

    // Populate the General tab
    $('#person-name').text(person.name);
    $('#person-id').text(person.id);
    $('#person-email').text(person.email);
    $('#person-phone').text(person.phone);

    // Populate the Education tab
    const educationList = $('#person-education');
    educationList.empty();
    person.education.forEach(edu => {
        const eduItem = $(`
                    <div class="education-item">
                        <div class="edu-degree">${edu.degree} in ${edu.field}</div>
                        <div class="edu-institution">${edu.institution}</div>
                        <div class="edu-year">${edu.year}</div>
                    </div>
                `);
        educationList.append(eduItem);
    });

    // Populate the Skills tab
    const skillsList = $('#person-skills');
    skillsList.empty();
    person.skills.forEach(skill => {
        const skillItem = $(`
                    <div class="skill-item">
                        <div class="skill-name">${skill}</div>
                    </div>
                `);
        skillsList.append(skillItem);
    });

    // Populate the Experience tab
    const experienceList = $('#person-experience');
    experienceList.empty();
    person.experience.forEach(exp => {
        const expItem = $(`
                    <div class="experience-item">
                        <div class="exp-position">${exp.position}</div>
                        <div class="exp-company">${exp.company}</div>
                        <div class="exp-period">${exp.period}</div>
                        <div class="exp-description">${exp.description}</div>
                    </div>
                `);
        experienceList.append(expItem);
    });
}

$(document).ready(function () {
    // Add double-click handler for My Network desktop icon
    $("#my-network").on("dblclick", function () {
        // Reset My Network content to default when opening
        $('#my-network-window .content-items').empty();
        $('#my-network-window .content-items').append(`
            <div class="Folder person-folder" data-person="ahmed-mohamed-ahmed">
                <img src="/static/Icons/person.ico">
                <span>Ahmed Mohamed Ahmed</span>
            </div>
            <div class="Folder person-folder" data-person="ahmed-mohamed-nasr">
                <img src="/static/Icons/person.ico">
                <span>Ahmed Mohamed Nasr</span>
            </div>
            <div class="Folder person-folder" data-person="abdelhady">
                <img src="/static/Icons/person.ico">
                <span>Abdelhady Mohamed</span>
            </div>
        `);

        // Re-attach the click handlers for person folders
        $('.person-folder').on('dblclick', function () {
            const personId = $(this).data('person');
            showPersonPropertiesDialog(personId);
        });

        openWindow($("#my-network-window"), "My Network");
    });


    // Add double-click handler for person folders
    $('.person-folder').on('dblclick', function () {
        const personId = $(this).data('person');
        showPersonPropertiesDialog(personId);
    });

    // Handle person properties dialog buttons
    $('#person-properties-dialog .xp-button').on('click', function () {
        const buttonText = $(this).text();
        if (buttonText === 'OK' || buttonText === 'Cancel') {
            $('#person-properties-dialog').hide();
            removeFromTaskbar("person-properties-dialog");
        }
    });

    // Handle tab switching for person properties dialog
    $('#person-properties-dialog .tab').on('click', function () {
        const tabId = $(this).data('tab');

        // Update active tab
        $('#person-properties-dialog .tab').removeClass('active');
        $(this).addClass('active');

        // Update active tab pane
        $('#person-properties-dialog .tab-pane').removeClass('active');
        $(`#person-properties-dialog #${tabId}-tab`).addClass('active');
    });
});


// Minesweeper Game Implementation
class Minesweeper {
    constructor() {
        this.setDifficulty('beginner');
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        this.timer = 0;
        this.timerInterval = null;
        this.flagCount = 0;
    }

    setDifficulty(difficulty) {
        switch (difficulty) {
            case 'beginner':
                this.rows = 9;
                this.cols = 9;
                this.mines = 10;
                break;
            case 'intermediate':
                this.rows = 16;
                this.cols = 16;
                this.mines = 40;
                break;
            case 'expert':
                this.rows = 16;
                this.cols = 30;
                this.mines = 99;
                break;
            default:
                this.rows = 9;
                this.cols = 9;
                this.mines = 10;
        }
        this.difficulty = difficulty;
    }

    init() {
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        this.timer = 0;
        this.flagCount = 0;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Initialize empty board
        for (let i = 0; i < this.rows; i++) {
            this.board[i] = [];
            this.revealed[i] = [];
            this.flagged[i] = [];
            for (let j = 0; j < this.cols; j++) {
                this.board[i][j] = 0;
                this.revealed[i][j] = false;
                this.flagged[i][j] = false;
            }
        }

        this.updateDisplay();
    }

    placeMines(excludeRow, excludeCol) {
        let minesPlaced = 0;
        while (minesPlaced < this.mines) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);

            // Don't place mine on first click or adjacent cells
            if (Math.abs(row - excludeRow) <= 1 && Math.abs(col - excludeCol) <= 1) {
                continue;
            }

            if (this.board[row][col] !== -1) {
                this.board[row][col] = -1;
                minesPlaced++;
            }
        }

        // Calculate numbers
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.board[i][j] !== -1) {
                    this.board[i][j] = this.countAdjacentMines(i, j);
                }
            }
        }
    }

    countAdjacentMines(row, col) {
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const newRow = row + i;
                const newCol = col + j;
                if (newRow >= 0 && newRow < this.rows &&
                    newCol >= 0 && newCol < this.cols &&
                    this.board[newRow][newCol] === -1) {
                    count++;
                }
            }
        }
        return count;
    }

    reveal(row, col) {
        if (this.gameOver || this.gameWon) return;
        if (this.revealed[row][col] || this.flagged[row][col]) return;

        // First click - place mines
        if (this.firstClick) {
            this.placeMines(row, col);
            this.firstClick = false;
            this.startTimer();
        }

        this.revealed[row][col] = true;

        // Hit a mine
        if (this.board[row][col] === -1) {
            this.gameOver = true;
            this.stopTimer();
            this.revealAllMines();
            this.updateSmiley('dead');
            return;
        }

        // Empty cell - reveal adjacent cells
        if (this.board[row][col] === 0) {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const newRow = row + i;
                    const newCol = col + j;
                    if (newRow >= 0 && newRow < this.rows &&
                        newCol >= 0 && newCol < this.cols) {
                        this.reveal(newRow, newCol);
                    }
                }
            }
        }

        this.updateDisplay();
        this.checkWin();
    }

    toggleFlag(row, col) {
        if (this.gameOver || this.gameWon) return;
        if (this.revealed[row][col]) return;

        this.flagged[row][col] = !this.flagged[row][col];
        this.flagCount += this.flagged[row][col] ? 1 : -1;
        this.updateDisplay();
    }

    revealAllMines() {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.board[i][j] === -1) {
                    this.revealed[i][j] = true;
                }
            }
        }
        this.updateDisplay();
    }

    checkWin() {
        let revealedCount = 0;
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.revealed[i][j]) revealedCount++;
            }
        }

        if (revealedCount === this.rows * this.cols - this.mines) {
            this.gameWon = true;
            this.gameOver = true;
            this.stopTimer();
            this.updateSmiley('win');
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            if (this.timer > 999) this.timer = 999;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    updateTimerDisplay() {
        const timerStr = this.timer.toString().padStart(3, '0');
        for (let i = 0; i < 3; i++) {
            const digit = timerStr[i];
            $(`#timer-digit-${i}`).attr('src', `/static/Minesweeper/digits/digit${digit}.png`);
        }
    }

    updateMineCountDisplay() {
        const mineCount = Math.max(0, this.mines - this.flagCount);
        const countStr = mineCount.toString().padStart(3, '0');
        for (let i = 0; i < 3; i++) {
            const digit = countStr[i];
            $(`#mine-digit-${i}`).attr('src', `/static/Minesweeper/digits/digit${digit}.png`);
        }
    }

    updateSmiley(state) {
        $('#smiley-face').attr('src', `/static/Minesweeper/smily/${state}.png`);
    }

    updateDisplay() {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const cell = $(`#cell-${i}-${j}`);

                if (this.flagged[i][j]) {
                    cell.html(`<img src="/static/Minesweeper/Tiles/TileFlag.png">`);
                } else if (this.revealed[i][j]) {
                    if (this.board[i][j] === -1) {
                        const imgSrc = (this.gameOver && !this.gameWon) ?
                            '/static/Minesweeper/Tiles/TileExploded.png' :
                            '/static/Minesweeper/Tiles/TileMine.png';
                        cell.html(`<img src="${imgSrc}">`);
                    } else if (this.board[i][j] === 0) {
                        cell.html(`<img src="/static/Minesweeper/Tiles/TileEmpty.png">`);
                    } else {
                        cell.html(`<img src="/static/Minesweeper/Tiles/Tile${this.board[i][j]}.png">`);
                    }
                } else {
                    cell.html(`<img src="/static/Minesweeper/Tiles/TileUnknown.png">`);
                }
            }
        }
        this.updateMineCountDisplay();
    }

    renderBoard(container) {
        const gameBoard = $('<div class="minesweeper-board"></div>');

        const tileSize = 18;
        const boardWidth = this.cols * tileSize;
        gameBoard.css('width', boardWidth + 5 + 'px');

        for (let i = 0; i < this.rows; i++) {
            const row = $('<div class="minesweeper-row"></div>');
            for (let j = 0; j < this.cols; j++) {
                const cell = $(`<div class="minesweeper-cell" id="cell-${i}-${j}"></div>`);
                cell.html(`<img src="/static/Minesweeper/Tiles/TileUnknown.png">`);

                cell.on('click', () => this.reveal(i, j));
                cell.on('contextmenu', (e) => {
                    e.preventDefault();
                    this.toggleFlag(i, j);
                    return false;
                });

                row.append(cell);
            }
            gameBoard.append(row);
        }

        container.append(gameBoard);
    }



    changeDifficulty(difficulty) {
        this.setDifficulty(difficulty);
        const container = $('#minesweeper-game-container');
        container.empty();

        const tileSize = 18;
        const boardWidth = this.cols * tileSize;
        const windowWidth = boardWidth + 6 + 60; // +6 for board borders, +60 for padding/margins
        $('#minesweeper-window').css('width', windowWidth + 'px');

        // Recreate the game
        const header = $(`
            <div class="minesweeper-header">
                <div class="mine-counter">
                    <img id="mine-digit-0" src="/static/Minesweeper/digits/digit0.png" width="13" height="23">
                    <img id="mine-digit-1" src="/static/Minesweeper/digits/digit1.png" width="13" height="23">
                    <img id="mine-digit-2" src="/static/Minesweeper/digits/digit0.png" width="13" height="23">
                </div>
                <div class="smiley-container">
                    <img id="smiley-face" src="/static/Minesweeper/smily/ok.png" width="26" height="26">
                </div>
                <div class="timer-display">
                    <img id="timer-digit-0" src="/static/Minesweeper/digits/digit0.png" width="13" height="23">
                    <img id="timer-digit-1" src="/static/Minesweeper/digits/digit0.png" width="13" height="23">
                    <img id="timer-digit-2" src="/static/Minesweeper/digits/digit0.png" width="13" height="23">
                </div>
            </div>
        `);

        container.append(header);
        this.renderBoard(container);
        this.init();

        // Re-attach smiley button handler
        $('#smiley-face').on('click', () => {
            this.init();
            this.updateSmiley('ok');
        });
    }
}

// Initialize when minesweeper window is opened
let minesweeperGame = null;

function initMinesweeper() {
    const container = $('#minesweeper-game-container');
    container.empty();

    minesweeperGame = new Minesweeper();

    const tileSize = 18;
    const boardWidth = minesweeperGame.cols * tileSize;
    const windowWidth = boardWidth + 6 + 50;
    $('#minesweeper-window').css('width', windowWidth + 'px');

    // Create header with mine counter, smiley, and timer
    const header = $(`
        <div class="minesweeper-header">
            <div class="mine-counter">
                <img id="mine-digit-0" src="/static/Minesweeper/digits/digit0.png" width="13" height="23">
                <img id="mine-digit-1" src="/static/Minesweeper/digits/digit1.png" width="13" height="23">
                <img id="mine-digit-2" src="/static/Minesweeper/digits/digit0.png" width="13" height="23">
            </div>
            <div class="smiley-container">
                <img id="smiley-face" src="/static/Minesweeper/smily/ok.png" width="26" height="26">
            </div>
            <div class="timer-display">
                <img id="timer-digit-0" src="/static/Minesweeper/digits/digit0.png" width="13" height="23">
                <img id="timer-digit-1" src="/static/Minesweeper/digits/digit0.png" width="13" height="23">
                <img id="timer-digit-2" src="/static/Minesweeper/digits/digit0.png" width="13" height="23">
            </div>
        </div>
    `);

    container.append(header);

    minesweeperGame.renderBoard(container);
    minesweeperGame.init();

    // Smiley button - restart game
    $('#smiley-face').on('click', () => {
        minesweeperGame.init();
        minesweeperGame.updateSmiley('ok');
    });
}

// Add to document ready
$(document).ready(function () {
    // Handle minesweeper icon double click
    $('#minesweeper-icon').on('dblclick', function () {
        openWindow($('#minesweeper-window'), 'Minesweeper');

        // Initialize game if not already initialized
        if (!minesweeperGame) {
            initMinesweeper();
        }
    });

    // Handle Game menu click
    $('#game-menu').on('click', function (e) {
        e.stopPropagation();
        const dropdown = $('#game-dropdown');
        dropdown.toggleClass('show');
    });

    // Handle Help menu click
    $('#help-menu').on('click', function () {
        openWindow($('#minesweeper-help-window'), 'Minesweeper Help');
    });

    // Close dropdown when clicking outside
    $(document).on('click', function () {
        $('.dropdown-menu').removeClass('show');
    });

    // Handle dropdown menu items
    $('.menu-item[data-action="new"]').on('click', function () {
        if (minesweeperGame) {
            minesweeperGame.init();
            minesweeperGame.updateSmiley('ok');
        }
        $('.dropdown-menu').removeClass('show');
    });

    $('.menu-item[data-difficulty]').on('click', function () {
        const difficulty = $(this).data('difficulty');
        if (minesweeperGame) {
            minesweeperGame.changeDifficulty(difficulty);
        }
        $('.dropdown-menu').removeClass('show');
    });

    $('.menu-item[data-action="exit"]').on('click', function () {
        $('#minesweeper-window').hide();
        removeFromTaskbar('minesweeper-window');
        $('.dropdown-menu').removeClass('show');
    });

    // Handle help window close button
    $('.help-close-btn').on('click', function () {
        $('#minesweeper-help-window').hide();
        removeFromTaskbar('minesweeper-help-window');
    });

    // Make help window interactive
    makeWindowInteractive($('#minesweeper-help-window'));
});

$(document).ready(function () {
    // Update the My Computer window content to include Project 2
    $("#computer-icon").on("dblclick", function () {
        // Reset My Computer content to default when opening
        $('#my-computer-window .content-items').empty();
        $('.section-title').show();

        $('#my-computer-window .content-items').append(`
            <div class="Folder" data-project="project1">
                <img src="/static/Icons/HardDrive.ico">
                <span>Project 1</span>
            </div>
            <div class="Folder" data-project="project2">
                <img src="/static/Icons/HardDrive.ico">
                <span>Project 2</span>
            </div>
        `);

        // Re-attach the click handlers for both projects
        $('.Folder[data-project]').on('click', function (e) {
            $('.Folder').removeClass('selected');
            $(this).addClass('selected');
        });

        $('.Folder[data-project]').on('dblclick', function () {
            const projectName = $(this).data('project');
            if (projectName === 'project1') {
                showUploadDialog('project1');
            } else if (projectName === 'project2') {
                showProject2Menu();
            }
        });

        openWindow($("#my-computer-window"), "My Computer");
    });

    // Function to show Project 2 selection menu
    function showProject2Menu() {
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        const dialogWidth = 500;
        const dialogHeight = 350;

        const left = (windowWidth - dialogWidth) / 2;
        const top = (windowHeight - dialogHeight) / 2;

        // Create Project 2 menu dialog if it doesn't exist
        if ($('#project2-menu-dialog').length === 0) {
            const menuDialog = $(`
                <div id="project2-menu-dialog" class="window"
                    style="display: none; width: 500px; height: 350px; position: absolute; z-index: 100;">
                    <div class="title-bar">
                        <img src="/static/Icons/HardDrive.ico" width="20px">
                        <div class="title-bar-text">Project 2 - Source Coding Analysis</div>
                        <div class="title-bar-controls">
                            <button aria-label="Minimize"></button>
                            <button aria-label="Maximize"></button>
                            <button aria-label="Close"></button>
                        </div>
                    </div>
                    <div class="window-body">
                        <div style="padding: 20px; font-family: 'Tahoma', sans-serif; font-size: 11px;">
                            <h3 style="margin-top: 0;">Select Analysis Type:</h3>
                            
                            <div class="Folder analysis-option" data-type="part1" style="margin: 15px 0; padding: 10px; cursor: pointer; border: 1px solid #c0c0c0;">
                                <img src="/static/Icons/text.ico" width="32" height="32" style="vertical-align: middle; margin-right: 10px;">
                                <div style="display: inline-block; vertical-align: middle;">
                                    <strong>Part 1: Uniform Distribution (M=4,6,8)</strong><br>
                                    <span style="color: #666; font-size: 10px;">Compare Fixed-length vs Huffman coding with uniform probabilities</span>
                                </div>
                            </div>

                            <div class="Folder analysis-option" data-type="part2" style="margin: 15px 0; padding: 10px; cursor: pointer; border: 1px solid #c0c0c0;">
                                <img src="/static/Icons/text.ico" width="32" height="32" style="vertical-align: middle; margin-right: 10px;">
                                <div style="display: inline-block; vertical-align: middle;">
                                    <strong>Part 2 & 4: Custom Text Analysis</strong><br>
                                    <span style="color: #666; font-size: 10px;">Analyze real text with Huffman and Shannon-Fano coding</span>
                                </div>
                            </div>

                            <div style="margin-top: 30px; padding: 10px; background-color: #f0f0f0; border: 1px solid #c0c0c0;">
                                <strong>Note:</strong> Both analyses will upload and process your text file to demonstrate source coding techniques.
                            </div>
                        </div>
                    </div>
                    <div class="resize-handle"></div>
                </div>
            `);

            $('body').append(menuDialog);
            makeWindowInteractive(menuDialog);

            // Handle analysis option selection
            $('.analysis-option').on('click', function () {
                $('.analysis-option').removeClass('selected');
                $(this).addClass('selected');
            });

            $('.analysis-option').on('dblclick', function () {
                const analysisType = $(this).data('type');
                $('#project2-menu-dialog').hide();
                removeFromTaskbar('project2-menu-dialog');
                showUploadDialog(analysisType);
            });

            // Handle close button
            $('#project2-menu-dialog .title-bar-controls button[aria-label="Close"]').on('click', function () {
                $('#project2-menu-dialog').hide();
                removeFromTaskbar('project2-menu-dialog');
            });
        }

        $('#project2-menu-dialog').css({
            left: left + "px",
            top: top + "px"
        }).show();

        addToTaskbar($("#project2-menu-dialog"), "Project 2 Menu");
        bringToFront($("#project2-menu-dialog"));
    }

    // Update the showUploadDialog function to handle both projects
    function showUploadDialog(projectType) {
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        const dialogWidth = 400;
        const dialogHeight = 200;

        const left = (windowWidth - dialogWidth) / 2;
        const top = (windowHeight - dialogHeight) / 2;

        // Store project type
        $('#upload-dialog').data('project-type', projectType);

        // Update dialog title based on project
        let title = 'Upload File';
        if (projectType === 'project1') {
            title = 'Upload File - Project 1';
        } else if (projectType === 'part1') {
            title = 'Upload File - Project 2 Part 1';
        } else if (projectType === 'part2') {
            title = 'Upload File - Project 2 Part 2/4';
        }
        $('#upload-dialog .title-bar-text').text(title);

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

        addToTaskbar($("#upload-dialog"), title);
        bringToFront($("#upload-dialog"));
    }

    // Update the upload button click handler
    $('#upload-button').on('click', function () {
        const buttonText = $(this).text();
        const projectType = $('#upload-dialog').data('project-type');

        if (buttonText === 'Upload') {
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
                const intervalTime = 150;

                const showNextBox = setInterval(function () {
                    if (currentBox < totalBoxes) {
                        $('.progress-box').eq(currentBox).addClass('visible');
                        currentBox++;
                    } else {
                        clearInterval(showNextBox);

                        setTimeout(function () {
                            $('.upload-progress').hide();
                            $('#upload-button').text('Analyze').prop('disabled', false);
                            $('.upload-message p').text(`File "${fileName}" uploaded successfully! Click "Analyze" to process the file.`);
                        }, 500);
                    }
                }, intervalTime);
            }
        } else if (buttonText === 'Analyze') {
            // Show analysis progress
            $('.upload-progress').show();
            $('.upload-message p').text('Analyzing file...');
            $(this).prop('disabled', true);

            // Create FormData to send the file
            const formData = new FormData();
            const fileInput = document.getElementById('file-input');
            formData.append('file', fileInput.files[0]);

            // Determine which endpoint to use
            let endpoint = '/analyze';
            if (projectType === 'part1') {
                endpoint = '/analyze_project2';
            } else if (projectType === 'part2') {
                endpoint = '/analyze_project2_custom';
            }

            // Send the file to Flask app
            $.ajax({
                url: endpoint,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    $('.upload-progress').hide();
                    $('#upload-dialog').hide();
                    removeFromTaskbar("upload-dialog");

                    // Handle different project types
                    if (projectType === 'project1') {
                        updateFolderContent(response);
                        setTimeout(function () {
                            openAnalysisFiles(response);
                        }, 500);
                        $('.section-title').hide();
                    } else if (projectType === 'part1') {
                        showProject2Part1Results(response);
                    } else if (projectType === 'part2') {
                        showProject2Part2Results(response);
                    }
                },
                error: function (xhr, status, error) {
                    $('.upload-progress').hide();
                    $('.upload-message p').text('Error: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
                    $('#upload-button').text('Upload').prop('disabled', false);
                }
            });
        }
    });

    // Function to display Project 2 Part 1 results
    function showProject2Part1Results(data) {
        let resultsText = "Source Coding Analysis - Part 1: Uniform Distributions\n";
        resultsText += "==========================================================\n\n";

        for (let key in data) {
            const result = data[key];
            resultsText += `Case M = ${result.M}\n`;
            resultsText += "─".repeat(60) + "\n";
            resultsText += `Entropy H(X) = ${result.entropy} bits/symbol\n\n`;

            resultsText += "Fixed-length codes:\n";
            for (let sym in result.fixed_codes) {
                resultsText += `  ${sym}: ${result.fixed_codes[sym]}\n`;
            }
            resultsText += `Average fixed length: ${result.avg_fixed} bits\n\n`;

            resultsText += "Huffman codes:\n";
            for (let sym in result.huffman_codes) {
                resultsText += `  ${sym}: ${result.huffman_codes[sym]}\n`;
            }
            resultsText += `Average Huffman length: ${result.avg_huffman} bits\n\n`;

            resultsText += "Comparison:\n";
            resultsText += `  Entropy  = ${result.entropy}\n`;
            resultsText += `  Fixed    = ${result.avg_fixed}\n`;
            resultsText += `  Huffman  = ${result.avg_huffman}\n`;
            resultsText += `  Huffman Efficiency = ${result.huffman_efficiency}\n\n`;

            resultsText += `Random sequence (30 symbols):\n${result.sequence}\n\n`;

            resultsText += "Encoded Bitstrings:\n";
            resultsText += `  Fixed-length: ${result.fixed_encoded}\n`;
            resultsText += `  Huffman     : ${result.huffman_encoded}\n\n`;

            resultsText += "Total bits required:\n";
            resultsText += `  Fixed-length: ${result.fixed_bits} bits\n`;
            resultsText += `  Huffman     : ${result.huffman_bits} bits\n`;
            resultsText += `  Compression ratio = ${result.compression_ratio}\n\n`;

            resultsText += "Decoding Verification:\n";
            resultsText += `  Fixed-length lossless: ${result.fixed_lossless ? 'YES ✓' : 'NO ✗'}\n`;
            resultsText += `  Huffman lossless     : ${result.huffman_lossless ? 'YES ✓' : 'NO ✗'}\n\n`;
            resultsText += "=".repeat(60) + "\n\n";
        }

        openProject2ResultWindow(resultsText, "Project 2 Part 1 Results");
    }

    // Function to display Project 2 Part 2 results
    function showProject2Part2Results(data) {
        let resultsText = "Source Coding Analysis - Part 2/4: Real Text Analysis\n";
        resultsText += "==========================================================\n\n";

        resultsText += "Text Statistics:\n";
        resultsText += "─".repeat(60) + "\n";
        resultsText += `Total characters: ${data.text_length}\n`;
        resultsText += `Unique characters: ${data.unique_chars}\n`;
        resultsText += `Entropy H(X): ${data.entropy} bits/symbol\n\n`;

        resultsText += "Average Code Lengths:\n";
        resultsText += "─".repeat(60) + "\n";
        resultsText += `Fixed-Length: ${data.avg_fixed} bits\n`;
        resultsText += `Huffman:      ${data.avg_huffman} bits\n`;
        resultsText += `Shannon-Fano: ${data.avg_fano} bits\n\n`;

        resultsText += "Compression Results:\n";
        resultsText += "─".repeat(60) + "\n";
        resultsText += `ASCII (8-bit):    ${data.ascii_size} bits\n`;
        resultsText += `Fixed-Length:     ${data.fixed_size} bits (${data.fixed_compression}% compression)\n`;
        resultsText += `Huffman:          ${data.huffman_size} bits (${data.huffman_compression}% compression)\n`;
        resultsText += `Shannon-Fano:     ${data.fano_size} bits (${data.fano_compression}% compression)\n\n`;

        resultsText += "Efficiency:\n";
        resultsText += "─".repeat(60) + "\n";
        resultsText += `Huffman Efficiency:      ${data.huffman_efficiency}%\n`;
        resultsText += `Shannon-Fano Efficiency: ${data.fano_efficiency}%\n\n`;

        resultsText += "Code Table (Top 20 Most Frequent Characters):\n";
        resultsText += "─".repeat(60) + "\n";
        resultsText += "Char | Freq  | Prob    | Fixed    | Huffman     | Fano\n";
        resultsText += "─".repeat(60) + "\n";

        data.code_table.forEach(row => {
            const char = row.char.padEnd(4);
            const freq = row.frequency.toString().padEnd(6);
            const prob = row.probability.toFixed(6).padEnd(8);
            const fixed = row.fixed.padEnd(9);
            const huffman = row.huffman.padEnd(12);
            const fano = row.fano;
            resultsText += `${char} | ${freq} | ${prob} | ${fixed} | ${huffman} | ${fano}\n`;
        });

        resultsText += "\n" + "=".repeat(60) + "\n";
        resultsText += "Both Huffman and Shannon-Fano are lossless compression methods.\n";
        resultsText += "Huffman is optimal for prefix-free codes.\n";

        openProject2ResultWindow(resultsText, "Project 2 Part 2/4 Results");
    }

    // Function to open Project 2 result window
    function openProject2ResultWindow(text, title) {
        const textWindow = $(`
            <div class="window project2-result-window"
                style="display: none; width: 700px; height: 500px; top: 80px; left: 150px; position: absolute; z-index: 100;">
                <div class="title-bar">
                    <img src="/static/Icons/text.ico" width="20px">
                    <div class="title-bar-text">${title}</div>
                    <div class="title-bar-controls">
                        <button aria-label="Minimize"></button>
                        <button aria-label="Maximize"></button>
                        <button aria-label="Close"></button>
                    </div>
                </div>
                <div class="window-body">
                    <div class="text-content">
                        <pre>${text}</pre>
                    </div>
                </div>
                <div class="resize-handle"></div>
            </div>
        `);

        $('body').append(textWindow);
        makeWindowInteractive(textWindow);
        openWindow(textWindow, title);

        // Handle close button
        textWindow.find('.title-bar-controls button[aria-label="Close"]').on('click', function () {
            textWindow.hide();
            removeFromTaskbar(textWindow.attr('id'));
            textWindow.remove();
        });
    }
});
