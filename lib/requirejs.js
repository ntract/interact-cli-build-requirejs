events.on("task:requirejs", function(task, options) {

	task.mainAttribute = task.mainAttribute || "main";
	
	FileSystem.mkdir(options.build);

	var treecontext = new TreeContext();
	var tree = treecontext.Tree(".", options.build);

	var requireConfigJSONS = new GlobCollection([
	 	cli.plugins_dirname+"/*/requirejs.json",
	]);
	var requireConfigsJSS = new GlobCollection([
	 	cli.plugins_dirname+"/*/requirejs.js",
	]);

	var requireJSONS = _.pluck(tree.mapGlobs(requireConfigJSONS).files, "location");
	var requireConfigs = _.pluck(tree.mapGlobs(requireConfigsJSS).files, "location");

	var requirejs = require("requirejs");
	var buildOpts = _.deepExtend({}, task.requirejs || {});

	function loadJSON(configPath) {
		var code = JSON.parse(fs.readFileSync(configPath).toString());
		buildOpts = _.deepExtend(buildOpts, code);
	}
	function loadConfig(require, configPath) {
		var code = fs.readFileSync(configPath).toString();
		eval(code);
	}

	var configPath = path.join(options.build, "requirejs.js");
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
		if (!bowerJSON[task.mainAttribute]) continue;

		var main = bowerJSON[task.mainAttribute];
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

	var includer = task.out; //"_plugins.js";
	fs.writeFileSync( path.join(options.build, includer ), requires );

	var name = task.out.replace(/\.js$/, "");

	buildOpts = _.deepExtend(buildOpts, {
		name: name,
		baseUrl: options.build,
		out: path.join(options.build, task.out), //"_plugins.js"),
		"optimize": "none", //"uglify2",
        "generateSourceMaps": true,
        "preserveLicenseComments": false,
        wrapShim: false
	});

	requirejs.optimize(buildOpts, function (buildResponse) {

		//events.emit("task:done", "requirejs");
		task.success();

    }, function(error) {
        
		console.log(error);

		//events.emit("task:done", "requirejs");
		task.success();

    });
	
});
