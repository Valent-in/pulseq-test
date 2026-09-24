function WamInit() {
    let initializeWamHost;
    let hostGroupId;
    let instances = [];

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

    this.loadModule = async function (name, mount, callback, index = 0) {
        let wamInstance;
        let wamGui;

        const pathToWam = "../wam-plugins/" + name + "/index.js";
        const audioContext = Tone.getContext().rawContext._nativeAudioContext;

        if (!initializeWamHost) {
            initializeWamHost = await import("../wam-plugins/utils/sdk/src/initializeWamHost.js");
            [hostGroupId] = await initializeWamHost.default(audioContext);
        }

        const { default: WAM } = await import(pathToWam);

        wamInstance = await WAM.createInstance(hostGroupId, audioContext);

        wamGui = await wamInstance.createGui();

        mount.innerHTML = "";
        mount.appendChild(wamGui);

        instances[index] = { wamInstance: wamInstance, wamGui: wamGui };
        console.log("WAM INIT COMPLETED", pathToWam);
        callback(wamInstance, index);
    }

    this.destroyModule = function (index = 0) {
        if (!instances[index]) {
            console.log("module index do not exist");
            return;
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