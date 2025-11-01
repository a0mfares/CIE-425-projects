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
        $(".taskbar-item").removeClass("active");
        $(`#taskbar-item-${windowId}`).addClass("active");
        return;
    }

    const iconSrc = window.find('.title-bar img').attr('src') || 'Icons/computer.ico';
    console.log("Icon source:", iconSrc);

    const taskBand = $("#task-band");
    taskBand.css({
        "display": "flex !important",
        "flex-grow": "1 !important",
        "align-items": "center !important",
        "padding": "0 5px !important",
        "position": "relative !important",
        "z-index": "1 !important"
    });

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

    taskbarItem.on("click", function () {
        console.log("Taskbar item clicked");
        const targetWindow = $(`#${windowId}`);
        if (targetWindow.is(":visible")) {
            targetWindow.hide();
            $(this).removeClass("active");
        } else {
            targetWindow.show();
            bringToFront(targetWindow);
            $(this).addClass("active");
        }
    });

    console.log("Task band element:", taskBand.length > 0 ? "Found" : "Not found");

    if (taskBand.length === 0) {
        console.error("Task band element not found!");
        return;
    }

    taskBand.append(taskbarItem);
    console.log("Taskbar item added to DOM");

    setTimeout(function () {
        taskbarItem.css({
            "display": "flex !important",
            "visibility": "visible !important",
            "opacity": "1 !important"
        });
        console.log("Forced taskbar item visibility");
    }, 10);

    taskbarItem.addClass("active");
    console.log("Taskbar item marked as active");

    console.log("Task band HTML:", taskBand.html());
}

function removeFromTaskbar(windowId) {
    console.log("Removing from taskbar:", windowId);
    $(`#taskbar-item-${windowId}`).remove();
}

function bringToFront(window) {
    console.log("Bringing window to front");
    windowZIndex++;
    window.css("z-index", windowZIndex);

    const windowId = window.attr("id");
    $(".taskbar-item").removeClass("active");
    $(`#taskbar-item-${windowId}`).addClass("active");

    activeWindowId = windowId;
}

function openWindow(window, title) {
    console.log("Opening window:", title);
    window.show();
    bringToFront(window);
    addToTaskbar(window, title);

    if (window.attr("id") === "my-computer-window") {
        $("#address-bar").text("My Computer");
    }
}

function makeWindowInteractive(windowElement) {
    windowElement.find('.title-bar').off('mousedown.drag');
    windowElement.find('.resize-handle').off('mousedown.resize');
    windowElement.find('.title-bar-controls button').off('click.control');

    windowElement.find('.title-bar').on('mousedown.drag', function (e) {
        if ($(e.target).is("button")) return;

        isDragging = true;
        currentWindow = $(this).closest(".window");

        if (currentWindow.hasClass("maximized")) return;

        const windowPos = currentWindow.offset();
        dragOffset.x = e.pageX - windowPos.left;
        dragOffset.y = e.pageY - windowPos.top;

        bringToFront(currentWindow);
        e.preventDefault();
    });

    windowElement.find('.resize-handle').on('mousedown.resize', function (e) {
        e.stopPropagation();

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
            window.removeClass("maximized");
            window.css({
                width: window.data("original-width") || "600px",
                height: window.data("original-height") || "400px",
                top: window.data("original-top") || "50px",
                left: window.data("original-left") || "100px"
            });
        } else {
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

$(document).ready(function () {
    console.log("Document ready, initializing...");

    console.log("Taskbar element:", $("#taskbar").length > 0 ? "Found" : "Not found");
    console.log("Task band element:", $("#task-band").length > 0 ? "Found" : "Not found");

    $("#taskbar").css({
        "display": "flex !important",
        "position": "fixed !important",
        "bottom": "0 !important",
        "left": "0 !important",
        "width": "100% !important",
        "height": "30px !important",
        "z-index": "9999 !important"
    });

    $("#task-band").css({
        "display": "flex !important",
        "flex-grow": "1 !important",
        "align-items": "center !important",
        "padding": "0 5px !important",
        "position": "relative !important",
        "z-index": "1 !important",
        "background-color": "rgba(0, 100, 200, 0.3) !important"
    });

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

    $(document).on('mouseup', function () {
        isDragging = false;
        isResizing = false;
        currentWindow = null;
    });

    $("#start-button").on("mouseenter", function () {
        $(this).addClass("hover");
    });

    $("#start-button").on("mouseleave", function () {
        $(this).removeClass("hover");
    });

    $("#start-button").on("click", function () {
        $(this).toggleClass("pressed");
    });

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
        $('#my-computer-window .content-items').empty();
        $('.section-title').show();

        $('#my-computer-window .content-items').append(`
            <div class="Folder" id="project1-folder">
                <img src="/static/Icons/HardDrive.ico">
                <span>Project 1</span>
            </div>
            <div class="Folder" id="project2-folder">
                <img src="/static/Icons/HardDrive.ico">
                <span>Project 2</span>
            </div>
        `);

        $('.Folder').on('click', function (e) {
            $('.Folder').removeClass('selected');
            $(this).addClass('selected');
        });

        openWindow($("#my-computer-window"), "My Computer");
    });

    $(".window").each(function () {
        makeWindowInteractive($(this));
    });

    const sections = document.querySelectorAll('.sidebar-section');
    sections.forEach(section => {
        const header = section.querySelector('.sidebar-header');
        const content = section.querySelector('.sidebar-content');
        header.classList.remove('collapsed');
        content.classList.remove('collapsed');
    });

    // PROJECT 2 - Four Parts Upload Dialogs
    function showUploadDialogPart(partNumber) {
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        const dialogWidth = 400;
        const dialogHeight = 200;

        const left = (windowWidth - dialogWidth) / 2;
        const top = (windowHeight - dialogHeight) / 2;

        const dialogId = `upload-dialog-part${partNumber}`;
        
        // Create dialog if it doesn't exist
        if ($(`#${dialogId}`).length === 0) {
            const partTitles = {
                1: 'Part 1: Uniform Distribution (M=4,6,8)',
                2: 'Part 2: Custom Distributions (Y & Z)',
                3: 'Part 3: Huffman Text Compression',
                4: 'Part 4: Shannon-Fano vs Huffman'
            };

            const needsFile = partNumber >= 3;

            const uploadDialog = $(`
                <div id="${dialogId}" class="window"
                    style="display: none; width: 400px; height: ${needsFile ? '200px' : '150px'}; position: absolute; z-index: 100;">
                    <div class="title-bar">
                        <div class="title-bar-text">Project 2 - ${partTitles[partNumber]}</div>
                        <div class="title-bar-controls">
                            <button aria-label="Minimize"></button>
                            <button aria-label="Maximize"></button>
                            <button aria-label="Close"></button>
                        </div>
                    </div>
                    <div class="window-body">
                        <div class="upload-content">
                            <div class="upload-message">
                                <p>${needsFile ? 'Select a text file to analyze:' : 'Click Analyze to run the analysis:'}</p>
                            </div>
                            ${needsFile ? `
                            <div class="file-input-container">
                                <input type="file" class="file-input-part" accept=".txt" style="display: none;">
                                <button class="file-select-button xp-button">Choose File</button>
                                <span class="file-name">No file selected</span>
                            </div>
                            ` : ''}
                            <div class="upload-progress" style="display: none; margin-top: 15px;">
                                <div class="progress-container">
                                    ${Array(15).fill('<div class="progress-box"></div>').join('')}
                                </div>
                            </div>
                            <div class="dialog-buttons" style="margin-top: 20px; margin-bottom: 10px;">
                                <button class="upload-button-part xp-button" ${needsFile ? 'disabled' : ''}>Analyze</button>
                                <button class="cancel-button-part xp-button">Cancel</button>
                            </div>
                        </div>
                    </div>
                    <div class="resize-handle"></div>
                </div>
            `);

            $('body').append(uploadDialog);
            makeWindowInteractive(uploadDialog);

            // File selection handler (for parts 3 and 4)
            if (needsFile) {
                uploadDialog.find('.file-select-button').on('click', function () {
                    uploadDialog.find('.file-input-part').click();
                });

                uploadDialog.find('.file-input-part').on('change', function () {
                    const fileName = $(this).val().split('\\').pop();
                    if (fileName) {
                        uploadDialog.find('.file-name').text(fileName);
                        uploadDialog.find('.upload-button-part').prop('disabled', false);
                    } else {
                        uploadDialog.find('.file-name').text('No file selected');
                        uploadDialog.find('.upload-button-part').prop('disabled', true);
                    }
                });
            }

            // Analyze button handler
            uploadDialog.find('.upload-button-part').on('click', function () {
                uploadDialog.find('.upload-progress').show();
                uploadDialog.find('.upload-message p').text('Analyzing...');
                $(this).prop('disabled', true);

                // Show progress animation
                uploadDialog.find('.progress-box').removeClass('visible');
                let currentBox = 0;
                const totalBoxes = uploadDialog.find('.progress-box').length;
                
                const showNextBox = setInterval(function () {
                    if (currentBox < totalBoxes) {
                        uploadDialog.find('.progress-box').eq(currentBox).addClass('visible');
                        currentBox++;
                    } else {
                        clearInterval(showNextBox);
                        
                        // Send request based on part
                        let endpoint = '';
                        let formData = new FormData();
                        
                        switch(partNumber) {
                            case 1:
                                endpoint = '/analyze_part1';
                                break;
                            case 2:
                                endpoint = '/analyze_part2';
                                break;
                            case 3:
                                endpoint = '/analyze_part3';
                                const fileInput3 = uploadDialog.find('.file-input-part')[0];
                                formData.append('file', fileInput3.files[0]);
                                break;
                            case 4:
                                endpoint = '/analyze_part4';
                                const fileInput4 = uploadDialog.find('.file-input-part')[0];
                                formData.append('file', fileInput4.files[0]);
                                break;
                        }

                        $.ajax({
                            url: endpoint,
                            type: 'POST',
                            data: formData,
                            processData: false,
                            contentType: false,
                            success: function (response) {
                                uploadDialog.find('.upload-progress').hide();
                                uploadDialog.hide();
                                removeFromTaskbar(dialogId);
                                showResultsWindow(response, partNumber);
                            },
                            error: function (xhr, status, error) {
                                uploadDialog.find('.upload-progress').hide();
                                uploadDialog.find('.upload-message p').text('Error: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
                                uploadDialog.find('.upload-button-part').text('Analyze').prop('disabled', false);
                            }
                        });
                    }
                }, 150);
            });

            // Cancel button handler
            uploadDialog.find('.cancel-button-part').on('click', function () {
                uploadDialog.hide();
                removeFromTaskbar(dialogId);
            });
        }

        // Reset and show dialog
        const dialog = $(`#${dialogId}`);
        if (partNumber >= 3) {
            dialog.find('.file-name').text('No file selected');
            dialog.find('.file-input-part').val('');
            dialog.find('.upload-button-part').prop('disabled', true);
        } else {
            dialog.find('.upload-button-part').prop('disabled', false);
        }
        dialog.find('.upload-progress').hide();
        dialog.find('.upload-message p').text(partNumber >= 3 ? 'Select a text file to analyze:' : 'Click Analyze to run the analysis:');

        dialog.css({
            left: left + "px",
            top: top + "px"
        }).show();

        addToTaskbar(dialog, `Project 2 Part ${partNumber}`);
        bringToFront(dialog);
    }

    // Show results window for Project 2
    function showResultsWindow(data, partNumber) {
        let resultsText = '';
        let windowTitle = `Project 2 Part ${partNumber} Results`;

        switch(partNumber) {
            case 1:
                resultsText = formatPart1Results(data);
                break;
            case 2:
                resultsText = formatPart2Results(data);
                break;
            case 3:
                resultsText = formatPart3Results(data);
                break;
            case 4:
                resultsText = formatPart4Results(data);
                break;
        }

        const resultWindow = $(`
            <div class="window result-window-part${partNumber}"
                style="display: none; width: 700px; height: 500px; top: 80px; left: 150px; position: absolute; z-index: 100;">
                <div class="title-bar">
                    <img src="/static/Icons/text.ico" width="20px">
                    <div class="title-bar-text">${windowTitle}</div>
                    <div class="title-bar-controls">
                        <button aria-label="Minimize"></button>
                        <button aria-label="Maximize"></button>
                        <button aria-label="Close"></button>
                    </div>
                </div>
                <div class="window-body">
                    <div class="text-content">
                        <pre>${resultsText}</pre>
                    </div>
                </div>
                <div class="resize-handle"></div>
            </div>
        `);

        $('body').append(resultWindow);
        makeWindowInteractive(resultWindow);
        openWindow(resultWindow, windowTitle);

        resultWindow.find('.title-bar-controls button[aria-label="Close"]').on('click', function () {
            resultWindow.hide();
            removeFromTaskbar(resultWindow.attr('class').match(/result-window-part\d+/)[0]);
            resultWindow.remove();
        });
    }

    function formatPart1Results(data) {
        let text = "Source Coding Analysis - Part 1: Uniform Distributions\n";
        text += "=".repeat(70) + "\n\n";

        for (let key in data) {
            const result = data[key];
            text += `CASE M = ${result.M}\n`;
            text += "─".repeat(70) + "\n\n";
            
            text += `Entropy H(X) = ${result.entropy} bits/symbol\n\n`;

            text += "Fixed-Length Codes:\n";
            for (let sym in result.fixed_codes) {
                text += `  Symbol ${sym}: ${result.fixed_codes[sym]}\n`;
            }
            text += `  Average Length: ${result.avg_fixed} bits\n\n`;

            text += "Huffman Codes:\n";
            for (let sym in result.huffman_codes) {
                text += `  Symbol ${sym}: ${result.huffman_codes[sym]}\n`;
            }
            text += `  Average Length: ${result.avg_huffman} bits\n\n`;

            text += "Performance Comparison:\n";
            text += `  Entropy (H):           ${result.entropy} bits\n`;
            text += `  Fixed-Length:          ${result.avg_fixed} bits\n`;
            text += `  Huffman:               ${result.avg_huffman} bits\n`;
            text += `  Huffman Efficiency:    ${result.huffman_efficiency}%\n\n`;

            text += `Random Sequence (30 symbols):\n${result.sequence}\n\n`;

            text += "Encoded Sequences:\n";
            text += `  Fixed-Length: ${result.fixed_encoded}\n`;
            text += `  Huffman:      ${result.huffman_encoded}\n\n`;

            text += "Compression Analysis:\n";
            text += `  Fixed-Length Bits:    ${result.fixed_bits} bits\n`;
            text += `  Huffman Bits:         ${result.huffman_bits} bits\n`;
            text += `  Compression Ratio:    ${result.compression_ratio}\n\n`;

            text += "Lossless Verification:\n";
            text += `  Fixed-Length: ${result.fixed_lossless ? 'YES ✓' : 'NO ✗'}\n`;
            text += `  Huffman:      ${result.huffman_lossless ? 'YES ✓' : 'NO ✗'}\n\n`;

            text += "Observations:\n";
            result.observations.forEach(obs => {
                text += `  • ${obs}\n`;
            });
            
            text += "\n" + "=".repeat(70) + "\n\n";
        }

        return text;
    }

    function formatPart2Results(data) {
        let text = "Source Coding Analysis - Part 2: Custom Distributions\n";
        text += "=".repeat(70) + "\n\n";

        for (let distName of ['Y', 'Z']) {
            const result = data[distName];
            text += `DISTRIBUTION ${result.distribution}\n`;
            text += "─".repeat(70) + "\n\n";

            text += "Probability Distribution:\n";
            for (let sym in result.probabilities) {
                text += `  Symbol ${sym}: ${result.probabilities[sym]}\n`;
            }
            text += `\nEntropy H(${result.distribution}) = ${result.entropy} bits/symbol\n\n`;

            text += "Fixed-Length Codes:\n";
            for (let sym in result.fixed_codes) {
                text += `  Symbol ${sym}: ${result.fixed_codes[sym]}\n`;
            }
            text += `  Average Length: ${result.avg_fixed} bits\n\n`;

            text += "Huffman Codes:\n";
            for (let sym in result.huffman_codes) {
                text += `  Symbol ${sym}: ${result.huffman_codes[sym]}\n`;
            }
            text += `  Average Length: ${result.avg_huffman} bits\n\n`;

            text += "Performance:\n";
            text += `  Entropy:              ${result.entropy} bits\n`;
            text += `  Fixed-Length:         ${result.avg_fixed} bits\n`;
            text += `  Huffman:              ${result.avg_huffman} bits\n`;
            text += `  Huffman Efficiency:   ${result.huffman_efficiency}%\n\n`;

            text += `Sequence: ${result.sequence}\n\n`;

            text += "Compression:\n";
            text += `  Fixed Bits:      ${result.fixed_bits}\n`;
            text += `  Huffman Bits:    ${result.huffman_bits}\n`;
            text += `  Ratio:           ${result.compression_ratio}\n\n`;

            text += "Observations:\n";
            result.observations.forEach(obs => {
                text += `  • ${obs}\n`;
            });

            text += "\n" + "=".repeat(70) + "\n\n";
        }

        if (data.comparison) {
            text += "COMPARISON:\n";
            text += "─".repeat(70) + "\n";
            data.comparison.forEach(comp => {
                text += `${comp}\n`;
            });
        }

        return text;
    }

    function formatPart3Results(data) {
        let text = "Source Coding Analysis - Part 3: Huffman Text Compression\n";
        text += "=".repeat(70) + "\n\n";

        text += "Text Statistics:\n";
        text += "─".repeat(70) + "\n";
        text += `Total Characters:     ${data.text_length}\n`;
        text += `Unique Characters:    ${data.unique_chars}\n`;
        text += `Entropy H(X):         ${data.entropy} bits/symbol\n`;
        text += `Avg Huffman Length:   ${data.avg_huffman} bits/symbol\n`;
        text += `Huffman Efficiency:   ${data.huffman_efficiency}%\n\n`;

        text += "Compression Results:\n";
        text += "─".repeat(70) + "\n";
        text += `ASCII (8-bit):        ${data.ascii_size} bits\n`;
        text += `Huffman:              ${data.huffman_size} bits\n`;
        text += `Compression:          ${data.compression_percentage}%\n`;
        text += `Lossless:             ${data.is_lossless ? 'YES ✓' : 'NO ✗'}\n\n`;

        text += "Code Table (Top 20 Characters):\n";
        text += "─".repeat(70) + "\n";
        text += "Char | Freq   | Probability | Huffman Code      | Length\n";
        text += "─".repeat(70) + "\n";

        data.code_table.forEach(row => {
            const char = row.char.padEnd(4);
            const freq = row.frequency.toString().padEnd(7);
            const prob = row.probability.toFixed(6).padEnd(12);
            const code = row.huffman_code.padEnd(18);
            text += `${char} | ${freq} | ${prob} | ${code} | ${row.code_length}\n`;
        });

        text += "\n" + "─".repeat(70) + "\n";
        text += "Sample Text:\n" + data.sample_text + "\n\n";

        text += "Observations:\n";
        data.observations.forEach(obs => {
            text += `  • ${obs}\n`;
        });

        return text;
    }

    function formatPart4Results(data) {
        let text = "Source Coding Analysis - Part 4: Shannon-Fano vs Huffman\n";
        text += "=".repeat(70) + "\n\n";

        text += "Text Statistics:\n";
        text += "─".repeat(70) + "\n";
        text += `Total Characters:     ${data.text_length}\n`;
        text += `Unique Characters:    ${data.unique_chars}\n`;
        text += `Entropy H(X):         ${data.entropy} bits/symbol\n\n`;

        text += "Average Code Lengths:\n";
        text += "─".repeat(70) + "\n";
        text += `Shannon-Fano:         ${data.avg_fano} bits/symbol\n`;
        text += `Huffman:              ${data.avg_huffman} bits/symbol\n\n`;

        text += "Compression Performance:\n";
        text += "─".repeat(70) + "\n";
        text += `ASCII (8-bit):        ${data.ascii_size} bits\n`;
        text += `Shannon-Fano:         ${data.fano_size} bits (${data.fano_compression}%)\n`;
        text += `Huffman:              ${data.huffman_size} bits (${data.huffman_compression}%)\n\n`;

        text += "Efficiency:\n";
        text += "─".repeat(70) + "\n";
        text += `Shannon-Fano:         ${data.fano_efficiency}%\n`;
        text += `Huffman:              ${data.huffman_efficiency}%\n\n`;

        text += "Lossless Verification:\n";
        text += "─".repeat(70) + "\n";
        text += `Shannon-Fano:         ${data.fano_lossless ? 'YES ✓' : 'NO ✗'}\n`;
        text += `Huffman:              ${data.huffman_lossless ? 'YES ✓' : 'NO ✗'}\n\n`;

        text += "Code Table Comparison (Top 20 Characters):\n";
        text += "─".repeat(70) + "\n";
        text += "Char | Freq   | Prob    | Fano Code    | Huffman Code | Lengths\n";
        text += "─".repeat(70) + "\n";

        data.code_table.forEach(row => {
            const char = row.char.padEnd(4);
            const freq = row.frequency.toString().padEnd(7);
            const prob = row.probability.toFixed(6).padEnd(8);
            const fano = row.fano_code.padEnd(13);
            const huffman = row.huffman_code.padEnd(13);
            text += `${char} | ${freq} | ${prob} | ${fano} | ${huffman} | F:${row.fano_length} H:${row.huffman_length}\n`;
        });

        text += "\n" + "─".repeat(70) + "\n";
        text += "Observations:\n";
        data.observations.forEach(obs => {
            text += `  • ${obs}\n`;
        });

        return text;
    }

    // Handle Project 2 folder context menu
    $(document).on('contextmenu', '#project2-folder', function (e) {
        e.preventDefault();
        const contextMenu = $('#context-menu-project2');
        
        if (contextMenu.length === 0) {
            const menu = $(`
                <div id="context-menu-project2" class="context-menu">
                    <div class="context-menu-item" data-action="open">Open</div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-part="1">Part 1: Uniform Distribution</div>
                    <div class="context-menu-item" data-part="2">Part 2: Custom Distributions</div>
                    <div class="context-menu-item" data-part="3">Part 3: Huffman Compression</div>
                    <div class="context-menu-item" data-part="4">Part 4: Shannon-Fano vs Huffman</div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="properties">Properties</div>
                </div>
            `);
            $('body').append(menu);
            
            menu.find('.context-menu-item').on('click', function () {
                const action = $(this).data('action');
                const part = $(this).data('part');
                
                if (action === 'properties') {
                    $('#properties-dialog-project2').show();
                    addToTaskbar($('#properties-dialog-project2'), 'Project 2 Properties');
                    bringToFront($('#properties-dialog-project2'));
                } else if (part) {
                    showUploadDialogPart(part);
                }
                
                menu.hide();
            });
        }
        
        $('#context-menu-project2').css({
            display: 'block',
            left: e.pageX + 'px',
            top: e.pageY + 'px'
        });
        
        return false;
    });

    // Handle Project 2 folder double-click
    $(document).on('dblclick', '#project2-folder', function () {
        // Show selection menu
        showProject2SelectMenu();
    });

    function showProject2SelectMenu() {
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        const dialogWidth = 500;
        const dialogHeight = 400;

        const left = (windowWidth - dialogWidth) / 2;
        const top = (windowHeight - dialogHeight) / 2;

        if ($('#project2-select-menu').length === 0) {
            const selectMenu = $(`
                <div id="project2-select-menu" class="window"
                    style="display: none; width: 500px; height: 400px; position: absolute; z-index: 100;">
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
                            <h3 style="margin-top: 0;">Select Analysis Part:</h3>
                            
                            <div class="Folder part-option" data-part="1" style="margin: 10px 0; padding: 10px; cursor: pointer; border: 1px solid #c0c0c0;">
                                <img src="/static/Icons/text.ico" width="32" height="32" style="vertical-align: middle; margin-right: 10px;">
                                <div style="display: inline-block; vertical-align: middle;">
                                    <strong>Part 1: Uniform Distribution (M=4,6,8)</strong><br>
                                    <span style="color: #666; font-size: 10px;">Compare Fixed-length vs Huffman coding</span>
                                </div>
                            </div>

                            <div class="Folder part-option" data-part="2" style="margin: 10px 0; padding: 10px; cursor: pointer; border: 1px solid #c0c0c0;">
                                <img src="/static/Icons/text.ico" width="32" height="32" style="vertical-align: middle; margin-right: 10px;">
                                <div style="display: inline-block; vertical-align: middle;">
                                    <strong>Part 2: Custom Distributions (Y & Z)</strong><br>
                                    <span style="color: #666; font-size: 10px;">Analyze non-uniform probability distributions</span>
                                </div>
                            </div>

                            <div class="Folder part-option" data-part="3" style="margin: 10px 0; padding: 10px; cursor: pointer; border: 1px solid #c0c0c0;">
                                <img src="/static/Icons/text.ico" width="32" height="32" style="vertical-align: middle; margin-right: 10px;">
                                <div style="display: inline-block; vertical-align: middle;">
                                    <strong>Part 3: Huffman Text Compression</strong><br>
                                    <span style="color: #666; font-size: 10px;">Upload text file for Huffman analysis</span>
                                </div>
                            </div>

                            <div class="Folder part-option" data-part="4" style="margin: 10px 0; padding: 10px; cursor: pointer; border: 1px solid #c0c0c0;">
                                <img src="/static/Icons/text.ico" width="32" height="32" style="vertical-align: middle; margin-right: 10px;">
                                <div style="display: inline-block; vertical-align: middle;">
                                    <strong>Part 4: Shannon-Fano vs Huffman</strong><br>
                                    <span style="color: #666; font-size: 10px;">Upload text file to compare both methods</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="resize-handle"></div>
                </div>
            `);

            $('body').append(selectMenu);
            makeWindowInteractive(selectMenu);

            selectMenu.find('.part-option').on('click', function () {
                $('.part-option').removeClass('selected');
                $(this).addClass('selected');
            });

            selectMenu.find('.part-option').on('dblclick', function () {
                const part = $(this).data('part');
                selectMenu.hide();
                removeFromTaskbar('project2-select-menu');
                showUploadDialogPart(part);
            });
        }

        $('#project2-select-menu').css({
            left: left + "px",
            top: top + "px"
        }).show();

        addToTaskbar($('#project2-select-menu'), 'Project 2 - Select Part');
        bringToFront($('#project2-select-menu'));
    }

    // Hide context menus when clicking elsewhere
    $(document).on('click', function () {
        $('.context-menu').hide();
    });

    // Handle tab switching
    $('.tab').on('click', function () {
        const tabId = $(this).data('tab');

        $('.tab').removeClass('active');
        $(this).addClass('active');

        $('.tab-pane').removeClass('active');
        $(`#${tabId}-tab`).addClass('active');
    });

    // Handle properties dialog buttons
    $('#properties-dialog .xp-button, #properties-dialog-project2 .xp-button').on('click', function () {
        const buttonText = $(this).text();
        if (buttonText === 'OK' || buttonText === 'Cancel') {
            $(this).closest('.window').hide();
            const windowId = $(this).closest('.window').attr('id');
            removeFromTaskbar(windowId);
        }
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
            "Python", "C++", "C#", "Dart", "JavaScript", "ASP.NET", "Flask",
            "Flutter", "HTML/CSS", "SQL", "Git/GitHub", "MATLAB Engine API",
            "NGROK", "MS SQL Server", "Code.org", "pywidevine"
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
            "Object-Oriented Programming", "Python (pandas, matplotlib)", "MATLAB",
            "C++/C#", "HTML/CSS", ".NET", "SQL", "Azure", "Seaborn", "NumPy",
            "SciPy", "Machine Learning", "Data Engineering"
        ],
        experience: [
            {
                position: "Microsoft Data Engineering Trainee",
                company: "Digital Egypt Pioneer",
                period: "June 2023 - November 2023",
                description: "Implemented ETL solutions, analyzed data using Python libraries, and developed machine learning models"
            }
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
            "MATLAB", "Signal Processing", "Information Theory",
            "Data Compression", "Cryptography"
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

function showPersonPropertiesDialog(personId) {
    const person = personData[personId];
    if (!person) return;

    $('#person-properties-dialog .title-bar-text').text(`${person.name} Properties`);

    const windowWidth = $(window).width();
    const windowHeight = $(window).height();
    const dialogWidth = 500;
    const dialogHeight = 450;

    const left = (windowWidth - dialogWidth) / 2;
    const top = (windowHeight - dialogHeight) / 2;

    $('#person-properties-dialog').css({
        left: left + "px",
        top: top + "px"
    }).show();

    addToTaskbar($("#person-properties-dialog"), `${person.name} Properties`);
    bringToFront($("#person-properties-dialog"));

    $('#person-name').text(person.name);
    $('#person-id').text(person.id);
    $('#person-email').text(person.email);
    $('#person-phone').text(person.phone);

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

    const skillsList = $('#person-skills');
    skillsList.empty();
    person.skills.forEach(skill => {
        const skillItem = $(`<div class="skill-item"><div class="skill-name">${skill}</div></div>`);
        skillsList.append(skillItem);
    });

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
    $("#my-network").on("dblclick", function () {
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

        $('.person-folder').on('dblclick', function () {
            const personId = $(this).data('person');
            showPersonPropertiesDialog(personId);
        });

        openWindow($("#my-network-window"), "My Network");
    });

    $('.person-folder').on('dblclick', function () {
        const personId = $(this).data('person');
        showPersonPropertiesDialog(personId);
    });

    $('#person-properties-dialog .xp-button').on('click', function () {
        const buttonText = $(this).text();
        if (buttonText === 'OK' || buttonText === 'Cancel') {
            $('#person-properties-dialog').hide();
            removeFromTaskbar("person-properties-dialog");
        }
    });

    $('#person-properties-dialog .tab').on('click', function () {
        const tabId = $(this).data('tab');
        $('#person-properties-dialog .tab').removeClass('active');
        $(this).addClass('active');
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

            if (Math.abs(row - excludeRow) <= 1 && Math.abs(col - excludeCol) <= 1) {
                continue;
            }

            if (this.board[row][col] !== -1) {
                this.board[row][col] = -1;
                minesPlaced++;
            }
        }

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

        if (this.firstClick) {
            this.placeMines(row, col);
            this.firstClick = false;
            this.startTimer();
        }

        this.revealed[row][col] = true;

        if (this.board[row][col] === -1) {
            this.gameOver = true;
            this.stopTimer();
            this.revealAllMines();
            this.updateSmiley('dead');
            return;
        }

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
        const windowWidth = boardWidth + 6 + 60;
        $('#minesweeper-window').css('width', windowWidth + 'px');

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

        $('#smiley-face').on('click', () => {
            this.init();
            this.updateSmiley('ok');
        });
    }
}

let minesweeperGame = null;

function initMinesweeper() {
    const container = $('#minesweeper-game-container');
    container.empty();

    minesweeperGame = new Minesweeper();

    const tileSize = 18;
    const boardWidth = minesweeperGame.cols * tileSize;
    const windowWidth = boardWidth + 6 + 50;
    $('#minesweeper-window').css('width', windowWidth + 'px');

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

    $('#smiley-face').on('click', () => {
        minesweeperGame.init();
        minesweeperGame.updateSmiley('ok');
    });
}

$(document).ready(function () {
    $('#minesweeper-icon').on('dblclick', function () {
        openWindow($('#minesweeper-window'), 'Minesweeper');

        if (!minesweeperGame) {
            initMinesweeper();
        }
    });

    $('#game-menu').on('click', function (e) {
        e.stopPropagation();
        const dropdown = $('#game-dropdown');
        dropdown.toggleClass('show');
    });

    $('#help-menu').on('click', function () {
        openWindow($('#minesweeper-help-window'), 'Minesweeper Help');
    });

    $(document).on('click', function () {
        $('.dropdown-menu').removeClass('show');
    });

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

    $('.help-close-btn').on('click', function () {
        $('#minesweeper-help-window').hide();
        removeFromTaskbar('minesweeper-help-window');
    });

    makeWindowInteractive($('#minesweeper-help-window'));
});