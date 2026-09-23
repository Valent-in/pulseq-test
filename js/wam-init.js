function WamInit() {
    let initializeWamHost;
    let hostGroupId;
    let wamInstance;
    let wamGui;

    fetch("wam-plugins/plugins.json").then(response => response.json()).then(data => {
        let select = document.getElementById("select-effect-module");
        data.forEach((e)=>{
            let o = document.createElement("OPTION");
            o.appendChild(document.createTextNode(e.name));
            o.value = e.path;
            select.appendChild(o);
        })
    }).catch(() => {
        console.log(" ! Can not fetch plugin list ! ");
    });

    this.loadModule = async function (name, mount, callback) {

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

        console.log("WAM INIT COMPLETED", pathToWam);
        callback(wamInstance.audioNode);
    }

    this.destroyModule = function () {
        if (wamGui) {
            wamGui.remove();

            wamInstance.destroyGui(wamGui);
            wamGui = null;
        }

        if (wamInstance) {
            wamInstance.audioNode.disconnect();
            wamInstance.audioNode.destroy();
        }
    }
}