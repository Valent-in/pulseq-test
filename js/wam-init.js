function WamInit(songObj) {
	let initializeWamHost;
	let hostGroupId;
	let instances = [];
	this.plugins = instances;
	let selectedSlot = 0;

	let pluginMounts = document.querySelectorAll(".js-plugin-mount");
	let pluginSelectors = document.querySelectorAll(".js-button-effect-select");

	class BridgeNode {
		constructor(nativeNode) {
			this.inGain = new Tone.getContext().rawContext.createGain();
			this.outGain = new Tone.getContext().rawContext.createGain();
			this.bridgeGain = Tone.getContext().rawContext.createGain();
			this.bridgeGain.gain.value = 0;
			this.nativeNode = nativeNode;

			this.inGain.connect(this.bridgeGain);
			this.bridgeGain.connect(this.outGain);
			this.inGain._nativeAudioNode.connect(nativeNode);
			nativeNode.connect(this.outGain._nativeAudioNode);
		}

		destroy() {
			this.inGain._nativeAudioNode.disconnect();
			this.inGain.disconnect();
			this.bridgeGain.disconnect();
			this.outGain.disconnect();

			this.inGain = null;
			this.outGain = null;
			this.bridgeGain = null;
			this.nativeNode = null;
		}
	}

	document.getElementById("menu-plugin-list-container").onclick = (event) => {
		if (!event.target.classList.contains("js-select-list-entry"))
			return;

		// delegated to external object which handles audionode graph
		songObj.unloadPlugin(selectedSlot);

		if (event.target.dataset.name)
			songObj.addPlugin(event.target.dataset.name, selectedSlot);
		else
			songObj.removePluginState(selectedSlot);

		hideModal("plugin-select-modal-menu");
	}

	for (let i = 0; i < 4; i++) {
		pluginSelectors[i].onclick = () => {
			selectedSlot = i;
			showModal("plugin-select-modal-menu");
		}
	}

	document.getElementById("button-plugin-select-close").onclick = () => {
		hideModal("plugin-select-modal-menu");
	};

	fetch("wam-plugins/plugins.json").then(response => response.json()).then(data => {
		buildPluginList(data);
	}).catch(() => {
		console.log(" ! Can not fetch plugin list ! ");
	});

	this.loadModule = async function (name, index = 0, showNameOnError) {
		let wamInstance;
		let wamGui;
		let mount = pluginMounts[index];
		mount.textContent = "Loading...";
		pluginSelectors[index].disabled = true;

		const pathToWam = "../wam-plugins/" + name + "/index.js";
		const audioContext = Tone.getContext().rawContext._nativeAudioContext;

		if (!initializeWamHost) {
			try {
				initializeWamHost = await import("../wam-plugins/utils/sdk/src/initializeWamHost.js");
				[hostGroupId] = await initializeWamHost.default(audioContext);
			} catch (error) {
				showAlert("Can not load plugins - WAM host initialization error\n" + error.message);
				throw error;
			}
		}

		try {
			const { default: WAM } = await import(pathToWam);
			wamInstance = await WAM.createInstance(hostGroupId, audioContext);
		} catch (error) {
			if (showNameOnError) {
				updatePluginSelector(index, name);
				mount.textContent = "Error";
			} else {
				mount.innerHTML = "";
			}

			pluginSelectors[index].disabled = false;
			showAlert("Can not load plugin " + name + "\n" + error.message);
			console.error(error.message);
			return;
		}

		wamGui = await wamInstance.createGui();

		mount.innerHTML = "";
		mount.appendChild(wamGui);
		updatePluginSelector(index, name);
		pluginSelectors[index].disabled = false;

		instances[index] = { wamInstance: wamInstance, wamGui: wamGui };

		instances[index].node = new BridgeNode(wamInstance.audioNode);

		console.log("WAM INIT COMPLETED", pathToWam);
	}

	this.destroyModule = function (index = 0) {
		updatePluginSelector(selectedSlot);

		if (!instances[index]) {
			pluginMounts[index].innerHTML = ""; // remove "Error" message
			console.log("module at index " + index + " does not exist");
			return;
		}

		if (instances[index].node) {
			instances[index].node.destroy();
		}

		if (instances[index].wamGui) {
			instances[index].wamGui.remove();
			instances[index].wamInstance.destroyGui(instances[index].wamGui);
		}

		if (instances[index].wamInstance) {
			instances[index].wamInstance.audioNode.disconnect();
			instances[index].wamInstance.audioNode.destroy();
		}

		instances[index] = null;
	}

	function updatePluginSelector(index, name) {
		if (name) {
			pluginSelectors[index].textContent = name;
			pluginSelectors[index].classList.add("button-select");
		} else {
			pluginSelectors[index].textContent = "+";
			pluginSelectors[index].classList.remove("button-select");
		}
	}

	function buildPluginList(list) {
		//showModal("plugin-select-modal-menu");

		let listContainer = document.getElementById("menu-plugin-list-container");
		listContainer.innerHTML = "";

		let noneEntry = document.createElement("DIV");
		noneEntry.classList.add("js-select-list-entry");
		noneEntry.classList.add("select-list-entry");
		noneEntry.classList.add("select-list-entry--none");

		//if (selected_plugin)
		//	noneEntry.classList.add("select-list-entry--current");

		//noneEntry.dataset.index = -1;
		noneEntry.appendChild(document.createTextNode("[none]"));
		listContainer.appendChild(noneEntry);

		for (let i = 0; i < list.length; i++) {
			let entry = document.createElement("DIV");
			entry.classList.add("js-select-list-entry");
			entry.classList.add("select-list-entry");

			//if (selected_plugin)
			//	entry.classList.add("select-list-entry--current");

			entry.dataset.name = list[i].name;
			entry.appendChild(document.createTextNode(list[i].name));
			listContainer.appendChild(entry);
		}

	}
}