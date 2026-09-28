function WamInit() {
    let initializeWamHost;
    let hostGroupId;
    let instances = [];
    this.plugins = instances;

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

    fetch("wam-plugins/plugins.json").then(response => response.json()).then(data => {
        let select1 = document.getElementById("select-effect-module-1");
        let select2 = document.getElementById("select-effect-module-2");
        data.forEach((e) => {
            {
                let o = document.createElement("OPTION");
                o.appendChild(document.createTextNode(e.name));
                o.value = e.path;
                select1.appendChild(o);
            }
            {
                let o = document.createElement("OPTION");
                o.appendChild(document.createTextNode(e.name));
                o.value = e.path;
                select2.appendChild(o);
            }
        })
    }).catch(() => {
        console.log(" ! Can not fetch plugin list ! ");
    });

    this.loadModule = async function (name, mount, index = 0) {
        let wamInstance;
        let wamGui;

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
            showAlert("Can not load plugin " + name + "\n" + error.message);
            console.error(error.message);
            return;
        }

        wamGui = await wamInstance.createGui();

        mount.innerHTML = "";
        mount.appendChild(wamGui);

        instances[index] = { wamInstance: wamInstance, wamGui: wamGui };

        instances[index].node = new BridgeNode(wamInstance.audioNode);

        console.log("WAM INIT COMPLETED", pathToWam);
    }

    this.destroyModule = function (index = 0) {
        if (!instances[index]) {
            console.log("module index does not exist");
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
}