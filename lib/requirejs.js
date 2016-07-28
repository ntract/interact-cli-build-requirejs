events.on("task:javascript", function(options) {
	
	FileSystem.mkdir(options.build);

	var treecontext = new TreeContext();
	var tree = treecontext.Tree(".", options.build);

	var requireConfigJSONS = new GlobCollection([
	 	cli.plugins_dirname+"/*/requirejs.json",
	]);
	var requireConfigsJSS = new GlobCollection([
	 	cli.plugins_dirname+"/*/config.js",
	]);

	var requireJSONS = _.pluck(tree.mapGlobs(requireConfigJSONS).files, "location");
	var requireConfigs = _.pluck(tree.mapGlobs(requireConfigsJSS).files, "location");

	var requirejs = require("requirejs");
	var buildOpts = {};

	function loadJSON(configPath) {
		var code = JSON.parse(fs.readFileSync(configPath).toString());
		buildOpts = _.deepExtend(buildOpts, code);
	}
	function loadConfig(require, configPath) {
		var code = fs.readFileSync(configPath).toString();
		eval(code);
	}

	var configPath = path.join(options.build, "config.js");
	try {	
		fs.statSync( configPath );
		loadConfig(requirejs, configPath);
	} catch(e) {}
	
	for (var i = 0, l = requireJSONS.length; i < l; i++) {
		loadJSON(requireJSONS[i]);
	}
	for (var i = 0, l = requireConfigs.length; i < l; i++) {
		loadConfig(requirejs, requireConfigs[i]);
	}

	var includes = [];
	var bowerJSONS = cli.project.getBowerJSONS(options.src);
	for (var k in bowerJSONS) {
		var bowerJSON = bowerJSONS[k];
		if (!bowerJSON.main) continue;

		var main = bowerJSON.main;
		if (!(main instanceof Array)) main = [main];

		for (var i = 0, l = main.length; i < l; i++) {
			includes.push({
				module: path.join(bowerJSON._location.relativeLocation, "../", main[i]).replace(/\\/g, "/").replace(/\.js$/,""),
				location: path.join(bowerJSON._location.location, "../", main[i])
			})
		}
	}

	var modules = _.pluck(includes, "module");
	var requires = "require([\""+modules.join("\",\"")+"\"], function() { });";

	var includer = "_plugins.js";
	fs.writeFileSync( path.join(options.build, includer ), requires );

	buildOpts = _.deepExtend(buildOpts, {
		name: "_plugins",
		baseUrl: options.build,
		out: path.join(options.build, "_plugins.js"),
		"optimize": "none", //"uglify2",
        "generateSourceMaps": true,
        "preserveLicenseComments": false,
        wrapShim: false
	});

	requirejs.optimize(buildOpts, function (buildResponse) {

        console.log("JavaScript done.");
		events.emit("task:done", "javascript");

    }, function(error) {
        
		console.log(error);

		console.log("JavaScript done.");
		events.emit("task:done", "javascript");

    });
	
});