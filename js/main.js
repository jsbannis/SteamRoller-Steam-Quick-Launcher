//===============
// SET API KEY  |
//===============
fs = require('fs');
var steamdir = 'C:\\Program Files (x86)\\Steam\\steamapps\\';
var installedOnly = false;

//Enter Steam API Key above.
//Obtaining an API key: http://steamcommunity.com/dev/apikey

//===============
// GET LISTINGS |
//===============
var scrape = function() {
    var ids = {};
    var libs = [];
    fs.readdirSync(steamdir).forEach(function(file) {
        parseLibs(steamdir + file, libs);
        parseGameCache(steamdir + file, ids);
    });
    libs.forEach(function(lib) {
        fs.readdirSync(lib).forEach(function (file) {
            parseGameCache(lib + file, ids);
        });
    });
    return ids;
};

var parseLibs = function(file, libs) {
    if(file.match('.*libraryfolders.vdf')) {
        var data = fs.readFileSync(file, 'utf8');
        data.split("\n").forEach(function(line) {
            var re = /\s*\"([^\"]+)\"\s*\"([^\"]+)\"\s*/;
            var keyvalue = re.exec(line);
            if(keyvalue != null) {
               libs[libs.length] = keyvalue[2] + "\\steamapps\\";
            }
        });
    }
};

var parseGameCache = function(file, ids) {
    if(file.match('.*\\.acf'))
    {
        var data = fs.readFileSync(file, 'utf8');
        data.split("\n").forEach(function(line) {
            var re = /\s*\"([^\"]+)\"\s*\"([^\"]+)\"\s*/;
            var keyValue = re.exec(line);
            if(keyValue != null && keyValue[1] === 'appID') {
                ids[keyValue[2]] = true;
            }
        });
    }
};

var buildGameList = function() {
    var ids = scrape();
    var request1 = "http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/" + "?key=" + APIKey + "&steamid=" + userID2 + "&format=json";
    var request2 = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/" + "?key=" + APIKey + "&steamid=" + userID2 + "&include_appinfo=1" + "&format=json";
    var games = {};

    $.ajaxSetup( { "async": false } );
    $.getJSON(request2, function (result) {
        result.response.games.forEach(function (key) {
            var game = {
                appID: key.appid,
                name: key.name,
                imageUrl: 'http://cdn.akamai.steamstatic.com/steam/apps/' + key.appid + '/header.jpg',
                playtime_forever: key.playtime_forever,
                playtime_2weeks: '',
                installed: key.appid in ids
            };
            games[game.appID] = game;
        });
    });
    $.getJSON(request1, function(result) {
        result.response.games.forEach(function(key) {
            if(key.appid in games)
            {
                games[key.appid].playtime_2weeks = key.playtime_2weeks;
            }
        });
    });
    return Object.keys(games).map(function (appID) {
        return games[appID];
    });
};

var sortGames = function(games) {
    games.sort(function(a, b) {
        if(a.playtime_2weeks > b.playtime_2weeks  ) {
            return -1;
        }
        if(a.playtime_2weeks   < b.playtime_2weeks  ) {
            return 1;
        }if(a.playtime_forever > b.playtime_forever ) {
            return -1;
        }
        if(a.playtime_forever  < b.playtime_forever ) {
            return 1;
        }
        if(a.name < b.name)
        {
            return -1;
        }
        if(a.name > b.name)
        {
            return 1;
        }
        return 0;
    });
};

// TODO this method should be async; need to show loading bar until we're done
var getListings = function() {
    $("#inner-content").html("");
    var games = buildGameList();
    sortGames(games);

    games.forEach(function (game) {
        if(!game.installed && installedOnly)
        {
            return;
        }

        // Check if image exists and use thumbnail, otherwise use missing.jpg
        $.get(game.imageUrl)
            .done(function() {
                $("#inner-content").append('<a href="steam://run/' + game.appID + '" class="clicky" id="' + game.name + '"><img class="img-zoom" src="' + game.imageUrl + '"></a>');
            })
            .fail(function() {
                $("#inner-content").append('<a href="steam://run/' + game.appID + '" class="clicky" id="' + game.name + '"><div class="missingTile img-zoom" style="width:250px; height:117px; background-image:url(images/missing.jpg); background-size: 250px 117px; background-repeat: no-repeat;"><p class="missingName">' + game.name + '</p></div></a>');
            });
    });
    $(".loader").hide();
};


//===================
// CHECK FOR USER ID |
//===================


$(document).ready(function() {

    if (localStorage.userID == null) {

        $("#inner-content").append('<div class="ask"><p>Enter your STEAM ID</p><input type="text" id="enteredName"><button onclick="enterUsername()">Submit</button><p id="userNotFound">User not found. Try again.</p><p id="userNotPublic">Profile is private</p></div>');

    } else {
        $(".ask").hide();
        $("#inner-content").append('<center><div class="loader" style="width:80px; margin-top:30px"><img src="images/loading.gif" width="80"></div></center>');
        userID2 = localStorage.userID;
        getListings(userID2);

    }

});



//===========================================
// FIND STEAM64 ID AND STORE IN localStorage |
//===========================================

var enterUsername = function() {
    var vanityurl = $("#enteredName").val();

    $.get('http://steamcommunity.com/id/' + vanityurl + '/?xml=1', {
            key: "value"
        })
        .done(function(xml) {
            var responseXML = $(xml).find('steamID64').first().text();
            if (!responseXML.length) {
                $('#userNotFound').css("display", "block");
                setTimeout(function() {
                    $("#userNotFound").fadeOut();
                }, 1500);
            } else {

                if ($(xml).find('privacyState').first().text() === "public") {
                    var clientid = $(xml).find('steamID64').first().text();
                    localStorage.userID = clientid;
                    $(".ask").hide();
                    userID2 = localStorage.userID;
                    getListings(userID2);
                    $("#inner-content").append('<center><div class="loader" style="width:80px; margin-top:30px"><img src="images/loading.gif" width="80"></div></center>');
                } else {
                    $('#userNotPublic').css("display", "block");
                    setTimeout(function() {
                        $("#userNotPublic").fadeOut();
                    }, 1500);
                }


            }
        });


};



//==========================
// MAXIMIZE FUNCTIONALITY   |
//==========================

var maximize = function() {
    var win = gui.Window.get();
    win.maximize();
    win.setShowInTaskbar(false);
    $("#maxi").attr("src", "images/minimize.png");
    $("#maxi").attr("onclick", "unmaximize()");
};

//==========================
// MINIMIZE FUNCTIONALITY   |
//==========================

var unmaximize = function() {
    var win = gui.Window.get();
    win.unmaximize();
    win.setShowInTaskbar(false);
    $("#maxi").attr("src", "images/maximize.png");
    $("#maxi").attr("onclick", "maximize()");
};


//==========================
// SEARCH BOX FUNCTIONALITY |
//==========================

var openSearch = function() {

    $("#changeUserName").slideUp();
    $("#searchBar").slideToggle();
    $("#hoverScrollUp").toggleClass("downabit");
    $("#filter").focus();
    $("#filter").val("");
    $("#filter").keyup();
};


//==========================
// SETTINGS FUNCTIONALITY  |
//==========================

var settings = function() {
    $("#searchBar").slideUp();
    $("#changeUserName").slideToggle();
    $("#changeUserName").focus();
};


//==========================
// SETTINGS FUNCTIONALITY  |
//==========================

var about = function() {
    var win = gui.Window.open('about.html', {
        position: 'center',
        width: 600,
        height: 600,
        "toolbar": false
    });

};

//==========================================
// FIND STEAM64 ID AND STORE IN CONFIG.JSON |
//==========================================

var saveNewUser = function() {
    var vanityurl = $("#newUsername").val();

    $.get('http://steamcommunity.com/id/' + vanityurl + '/?xml=1', {
            key: "value"
        })
        .done(function(xml) {
            var responseXML = $(xml).find('steamID64').first().text();
            if (!responseXML.length) {
                $('#userNotFound').css("display", "block");
                setTimeout(function() {
                    $("#userNotFound").fadeOut();
                }, 1500);
            } else {
                if ($(xml).find('privacyState').first().text() === "public") {
                    var clientid = $(xml).find('steamID64').first().text();
                    localStorage.userID = clientid;
                    $(".ask").hide();
                    userID2 = localStorage.userID;
                    getListings(userID2);
                    $("#changeUserName").slideToggle();
                    $("#inner-content").append('<center><div class="loader" style="width:80px; margin-top:30px"><img src="images/loading.gif" width="80"></div></center>');
                } else {
                    $('#userNotPublic').css("display", "block");
                    setTimeout(function() {
                        $("#userNotPublic").fadeOut();
                    }, 1500);
                }
            }
        });


};



//==========================
// FRONT-END FUNCTIONALITY  |
//==========================

$(document).ready(function() {


    //================
    // SMOOTH SCROLL  |
    //================
    $(function() {

        var $window = $('#inner-content');
        var scrollTime = 1.2;
        var scrollDistance = 350;

        $window.on("mousewheel DOMMouseScroll", function(event) {

            event.preventDefault();

            var delta = event.originalEvent.wheelDelta / 120 || -event.originalEvent.detail / 3;
            var scrollTop = $window.scrollTop();
            var finalScroll = scrollTop - parseInt(delta * scrollDistance);

            TweenMax.to($window, scrollTime, {
                scrollTo: {
                    y: finalScroll,
                    autoKill: true
                },
                ease: Power1.easeOut,
                overwrite: 5
            });

        });
    });


    //=============
    // ANIMATIONS  |
    //=============

    $('body').on('click', '.clicky', function(e) {
        var thisItem = $(this);
        thisItem.addClass('animated bounce');
        setTimeout(function() {
            thisItem.removeClass('animated bounce');
        }, 1000);
    });


    //=======================
    // SEARCH FUNCTIONALITY  |
    //=======================
    
    $("#filter").keyup(function() {

        // Retrieve the input field text and reset the count to zero
        var filter = $(this).val();

        // Loop through the comment list
        $(".clicky").each(function() {

            // If the list item does not contain the text phrase fade it out
            if ($(this).attr("id").search(new RegExp(filter, "i")) < 0) {
                $(this).fadeOut();

                // Show the list item if the phrase matches and increase the count by 1
            } else {
                $(this).show();
            }
        });
    });

    //==============
    // AUTO-SCROLL  |
    //==============
    setInterval(function(){
        if($("#hoverScrollDown:hover").length != 0) {
            var win = $('#inner-content');
            var newpos = win.scrollTop() + 5;
            win.scrollTop(newpos);
        }
        if($("#hoverScrollUp:hover").length != 0) {
            var win = $('#inner-content');
            var newpos = win.scrollTop() - 5;
            win.scrollTop(newpos);
        }
    }, 1000/144); //Smooth for people like me with 144hz monitors!
});
