<script lang="ts">
    import { Tree, Button, Dock } from "siyuan-kit-svelte";
    import { onDestroy, onMount } from "svelte";
    import { Menu, Dialog } from "siyuan";
    import ConfirmInput from "@/libs/confirm-input.svelte";
    import MoveTree from "@/libs/move-tree.svelte";
    import { store_boardmix_header, openLoginFun } from "@/libs/store";
    import {
        createFolder,
        createFile,
        rename,
        getFolder,
        getTeams,
        getProjects,
        getFiles,
        getSpaceConfig,
        trash,
        move,
    } from "@/libs/boardmix-api";
    import { pushErrMsg, copy } from "@/libs/api";

    // export let app;
    export let plugin;
    export let treeNodes;
    export let refreshTree;

    const TAB_TYPE = "boardmix_tab";
    let treeNodeMap = {};

    let vir_node = {
        type: "vir_node",
        name: "加载中...",
        nodeId: "vir_node",
        icon: "iconFile",
    };

    onMount(async () => {
        refreshTree();
    });

    onDestroy(() => {});

    let nodeClick = (e) => {
        console.log("open:", e);
    };

    // 更多菜单
    let moreClick = (targetNode, e) => {
        console.log(targetNode, e);
        let type = targetNode.type;
        let url = "https://boardmix.cn/app/editor/" + targetNode.nodeId;
        let name = targetNode.name;
        const menu = new Menu("boardmix-menu", () => {});

        if (type === "file") {
            menu.addItem({
                icon: "",
                label: "用tab打开",
                click: () => {
                    console.log("单击菜单了,", e);
                    plugin.openBoardMixTab({
                        tabType: targetNode.nodeId,
                        name: name,
                        url: url,
                        showCookieButton: false,
                    });
                },
            });
            menu.addItem({
                icon: "",
                label: "在浏览器打开",
                click: () => {
                    globalThis.open(url);
                },
            });
            menu.addItem({
                icon: "",
                label: "复制插件链接",
                click: () => {
                    let pluginUrl = `[${name}](siyuan://plugins/plugin-boardmix?name=${name}&id=${targetNode.nodeId})`;
                    copy(pluginUrl);
                },
            });
            menu.addItem({
                icon: "",
                label: "复制在线链接",
                click: () => {
                    copy(url);
                },
            });
        } else if (type === "folder" || type === "project" || type === "team") {
            if (type === "team") {
                menu.addItem({
                    icon: "",
                    label: "新建项目",
                    click: () => {
                        alert("新建项目");
                    },
                });
            } else if (type === "folder" || type === "project") {
                menu.addItem({
                    icon: "",
                    label: "新建白板文件",
                    click: () => {
                        const di = new Dialog({
                            title: "新建白板文件",
                            content: `<div class="b3-dialog__content"><div id="new-boardmix"></div></div>`,
                            width: "520px",
                        });

                        let ci = new ConfirmInput({
                            target: document.querySelector("#new-boardmix"),
                            props: {
                                confirmCall: async (value) => {
                                    if (value) {
                                        let fileRes = await createFile(
                                            targetNode,
                                            value,
                                        );
                                        if (fileRes) {
                                            fileRes = {
                                                type: "file",
                                                name: fileRes.name,
                                                team_id: fileRes.team_id,
                                                project_id: fileRes.project_id,
                                                folder_id: fileRes.folder_id,
                                                nodeId: fileRes.file_key,
                                                icon: "iconFile",
                                            };
                                            await updateTreeNodes("new", {
                                                targetNode: targetNode,
                                                newNode: fileRes,
                                            });

                                            plugin.openBoardMixTab({
                                                tabType: fileRes.nodeId,
                                                name: fileRes.name,
                                                url:
                                                    "https://boardmix.cn/app/editor/" +
                                                    fileRes.nodeId,
                                                showCookieButton: false,
                                            });
                                        }

                                        di.destroy();
                                        ci.$destroy();
                                    } else {
                                        pushErrMsg("必须填写内容");
                                    }
                                },
                            },
                        });
                    },
                });
                menu.addItem({
                    icon: "",
                    label: "新建文件夹",
                    click: () => {
                        const di = new Dialog({
                            title: "新建文件夹",
                            content: `<div class="b3-dialog__content"><div id="new-folder"></div></div>`,
                            width: "520px",
                        });

                        let ci = new ConfirmInput({
                            target: document.querySelector("#new-folder"),
                            props: {
                                confirmCall: async (value) => {
                                    if (value) {
                                        let folderRes = await createFolder(
                                            targetNode,
                                            value,
                                        );
                                        if (folderRes) {
                                            folderRes = {
                                                type: "folder",
                                                name: folderRes.name,
                                                team_id: folderRes.team_id,
                                                project_id:
                                                    folderRes.project_id,
                                                nodeId: folderRes.id,
                                                icon: "iconFolder",
                                            };
                                            updateTreeNodes("new", {
                                                targetNode: targetNode,
                                                newNode: folderRes,
                                            });
                                        }

                                        di.destroy();
                                        ci.$destroy();
                                    } else {
                                        pushErrMsg("必须填写内容");
                                    }
                                },
                            },
                        });
                    },
                });
            }
            menu.addItem({
                icon: "",
                label: "刷新子节点",
                click: async () => {
                    await updateChildren(targetNode);
                    expandedIds = expandedIds.filter(
                        (node) => node.nodeId != targetNode.nodeId,
                    );
                    oldExpandedIds = expandedIds;
                },
            });
        }

        if (new Set(["folder", "file", "project", "team"]).has(type)) {
            if (!targetNode.isDefaultProject) {
                //个人空间的默认项目不能删 ， 也不能重命名
                menu.addItem({
                    icon: "",
                    label: "删除",
                    click: async () => {
                        let parentNode = treeNodeMap[targetNode.parent_nodeId];
                        let res = await trash(targetNode);
                        if (res.code === 0) {
                            //刷新父级节点、
                            await updateChildren(parentNode);
                        }
                    },
                });

                menu.addItem({
                    icon: "",
                    label: "重命名",
                    click: () => {
                        // 重命名
                        const di = new Dialog({
                            title: "重命名",
                            content: `<div class="b3-dialog__content"><div id="rename-boardmix"></div></div>`,
                            width: "520px",
                        });

                        let ci = new ConfirmInput({
                            target: document.querySelector("#rename-boardmix"),
                            props: {
                                name: targetNode.name,
                                confirmCall: async (value) => {
                                    if (value) {
                                        let renameRes = await rename(
                                            targetNode,
                                            value,
                                        );
                                        if (renameRes) {
                                            // targetNode.name = value;
                                            updateTreeNodes("rename", {
                                                targetNode: targetNode,
                                                newName: value,
                                            });
                                        }

                                        di.destroy();
                                        ci.$destroy();
                                    } else {
                                        pushErrMsg("必须填写内容");
                                    }
                                },
                            },
                        });
                    },
                });

                if (new Set(["folder", "file"]).has(type)) {
                    // 移动：只有文件或文件夹才能移动
                    menu.addItem({
                        icon: "",
                        label: "移动",
                        click: () => {
                            const di = new Dialog({
                                title: "移动",
                                content: `<div class="b3-dialog__content"><div id="move-tree"></div></div>`,
                                width: "520px",
                                height: "600px",
                            });

                            let ci = new MoveTree({
                                target: document.querySelector("#move-tree"),
                                props: {
                                    callMove: async (moveNode) => {
                                        if (
                                            moveNode.nodeId ===
                                            targetNode.nodeId
                                        ) {
                                            pushErrMsg("不能选当前节点");
                                            return;
                                        }
                                        if (
                                            moveNode.nodeId ===
                                            targetNode.parent_nodeId
                                        ) {
                                            pushErrMsg(
                                                "已经在该节点下, 无需移动 ",
                                            );
                                            return;
                                        }

                                        let moveSuccess = await move(
                                            targetNode,
                                            moveNode,
                                        );
                                        if (moveSuccess) {
                                            updateTreeNodes("move", {
                                                targetNode: targetNode,
                                                moveNode: moveNode,
                                            });
                                            di.destroy();
                                            ci.$destroy();
                                        } else {
                                            pushErrMsg(
                                                "移动失败，检查控制台网络请求",
                                            );
                                        }
                                    },
                                    srcNode: targetNode,
                                },
                            });
                        },
                    });
                }
            }
        }

        menu.open({
            x: e.clientX,
            y: e.clientY,
            isLeft: true,
        });
        console.log("打开了");
        e.stopPropagation();
    };

    async function genBoardmixHeader() {
        let BOARDMIX_CONFIG = await plugin.loadData("BOARDMIX_CONFIG");
        let access_token = BOARDMIX_CONFIG["access_token"];

        store_boardmix_header.set({
            accept: "application/json, text/plain, */*",
            "accept-language":
                "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
            authorization: "Bearer " + access_token,
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "x-lang": "zh-CN",
        });
    }

    refreshTree = async () => {
        //关闭所有展开的节点
        expandedIds = [];
        oldExpandedIds = [];
        await genBoardmixHeader();
        let spaceRes = await getSpaceConfig();
        let { project_id, team_id } = spaceRes;
        console.log(project_id);
        console.log(team_id);

        //获取团队
        let teamRes = await getTeams();
        console.log(teamRes);
        teamRes = teamRes.map((item) => {
            let node: any = {
                type: "team",
                name: item.name,
                nodeId: item.id,
                icon: "iconFolder",
                children: [Object.assign({}, vir_node)],
            };
            return node;
        });

        //获取项目下的根文件夹
        let projectFolderRes = await getFolder(team_id, project_id, 0);
        console.log(projectFolderRes);
        projectFolderRes = projectFolderRes.map((item) => {
            let node: any = {
                type: "folder",
                name: item.name,
                team_id: item.team_id,
                project_id: item.project_id,
                nodeId: item.id,
                icon: "iconFolder",
            };
            if (item.file_count > 0 || item.folder_count > 0) {
                node.children = [Object.assign({}, vir_node)];
            }

            return node;
        });

        //获取文件
        let filesRes: any = await getFiles(team_id, project_id, 0);
        let files = filesRes.map((item) => {
            let node: any = {
                type: "file",
                name: item.name,
                team_id: item.team_id,
                project_id: item.project_id,
                folder_id: item.folder_id,
                nodeId: item.file_key,
                icon: "iconFile",
            };
            if (item.file_count > 0 || item.folder_count > 0) {
                node.children = [Object.assign({}, vir_node)];
            }

            return node;
        });

        projectFolderRes = projectFolderRes.concat(files);

        //更新 treeNotes 节点
        await updateTreeNodes("equals", {
            nodes: [
                {
                    type: "project",
                    isDefaultProject: true,
                    name: "个人空间：默认项目",
                    nodeId: project_id,
                    team_id: team_id,
                    icon: "iconFolder",
                    children: projectFolderRes,
                },
                ...teamRes,
            ],
        });
    };

    let expandedChange = async (e) => {
        let { toggleNodeId, isExpanded } = getCurrToggle(e.detail);
        // console.log(toggleNodeId, isExpanded ? "展开了" : "关闭了");
        let toggleNode = treeNodeMap[toggleNodeId];
        let hasVirtualNode =
            toggleNode.children &&
            toggleNode.children.some((item) => item.type === "vir_node");
        if (isExpanded && hasVirtualNode) {
            await updateChildren(toggleNode);
        }
    };

    //更新子节点
    async function updateChildren(targetNode) {
        console.log("mytree-updateChildren");
        //删除虚拟节点。
        let type = targetNode.type;
        let children = [];
        if (type === "folder" || type === "project") {
            let folder_id, project_id, team_id;
            if (type === "project") {
                folder_id = 0;
                project_id = targetNode.nodeId;
            } else {
                folder_id = targetNode.nodeId;
                project_id = targetNode.project_id;
            }
            team_id = targetNode.team_id;

            //获取文件夹
            let folderRes = await getFolder(team_id, project_id, folder_id);
            // console.log(folderRes);
            children = folderRes.map((item) => {
                let node: any = {
                    type: "folder",
                    name: item.name,
                    team_id: item.team_id,
                    project_id: item.project_id,
                    nodeId: item.id,
                    icon: "iconFolder",
                };
                if (item.file_count > 0 || item.folder_count > 0) {
                    node.children = [Object.assign({}, vir_node)];
                }

                return node;
            });

            //获取文件
            let filesRes: any = await getFiles(team_id, project_id, folder_id);
            let files = filesRes.map((item) => {
                let node: any = {
                    type: "file",
                    name: item.name,
                    team_id: item.team_id,
                    project_id: item.project_id,
                    folder_id: item.folder_id,
                    nodeId: item.file_key,
                    icon: "iconFile",
                };
                if (item.file_count > 0 || item.folder_count > 0) {
                    node.children = [Object.assign({}, vir_node)];
                }

                return node;
            });

            children = children.concat(files);
        } else {
            // 获取团队项目
            let projectsRes = await getProjects(targetNode.nodeId);
            children = projectsRes.map((item) => {
                let node: any = {
                    type: "project",
                    name: item.name,
                    nodeId: item.id,
                    icon: "iconFolder",
                    children: [Object.assign({}, vir_node)],
                };

                if (item.file_count > 0 || item.folder_count > 0) {
                    node.children = [Object.assign({}, vir_node)];
                }
                return node;
            });
        }

        await updateTreeNodes("update_children", {
            children: children,
            targetNode: targetNode,
        });
    }
    /**
     * 获取当前正在操作的节点
     */
    function getCurrToggle(newExpandedIds) {
        //新旧最多，相差一个
        let isExpanded = newExpandedIds.length > oldExpandedIds.length;
        let complement = newExpandedIds
            .filter((v) => !oldExpandedIds.includes(v))
            .concat(oldExpandedIds.filter((v) => !newExpandedIds.includes(v)));
        let toggleNodeId = complement[0];
        oldExpandedIds = newExpandedIds.slice(0);
        return { toggleNodeId: toggleNodeId, isExpanded: isExpanded };
    }

    /**
     * 更新TreeNodes , 同时更新treeNodeMap
     */
    async function updateTreeNodes(type, data) {
        // 全等， 新建，获取children， 重命名，删除，移动
        if (type === "equals") {
            treeNodes = data.nodes;
            updateTreeNodeMap(data.nodes);
            console.log(treeNodeMap);
        } else if (type === "new") {
            let targetNode = data.targetNode;
            let children = [...(targetNode.children || []), data.newNode];
            targetNode.children = children;
            //更新treeNodes
            treeNodes = treeNodes;
            //更新map
            updateTreeNodeMap(children, targetNode.nodeId);
        } else if (type === "update_children") {
            let children = data.children;
            let tree_path_arr = data.targetNode.tree_path_arr;
            let targetNode = tree_path_arr.reduce((tempTreeNodes, targetId) => {
                if (!Array.isArray(tempTreeNodes)) {
                    tempTreeNodes = tempTreeNodes.children;
                }
                return tempTreeNodes.find((item) => item.nodeId == targetId);
            }, treeNodes);
            targetNode.children = children;
            //更新treeNodes
            treeNodes = treeNodes;
            //更新map
            updateTreeNodeMap(children, targetNode.nodeId);

            // data.targetNode
        } else if (type === "move") {
            let targetNode = data.targetNode;
            let moveNode = data.moveNode;            
            // let move_tree_path_arr = moveNode.tree_path_arr;
            moveNode = treeNodeMap[data.moveNode.nodeId];
            if (moveNode) {
                let targetParentNode = treeNodeMap[targetNode.parent_nodeId];
                let targetChildren = (targetParentNode.children || []).filter(
                    (node) => {
                        return node.nodeId !== targetNode.nodeId;
                    },
                );
                let moveChildren = [...(moveNode.children || []), targetNode];

                // 刷新原父节点
                await updateTreeNodes("update_children", {
                    children: targetChildren,
                    targetNode: targetParentNode,
                });

                // 刷新新父节点
                await updateTreeNodes("update_children", {
                    children: moveChildren,
                    targetNode: moveNode,
                });
            }else{
                 //可能有的节点没展开还没存入treeNodeMap
                refreshTree();
                // move_tree_path_arr = await move_tree_path_arr.reduce(async (pre, nid)=>{
                //     let currentNode = treeNodeMap[nid];
                //     console.log(currentNode);
                //     await updateChildren(currentNode);
                //     console.log(currentNode);
                //     return (await pre).concat(nid)
                // }, []);
                // expandedIds = [...expandedIds,...move_tree_path_arr]
                // oldExpandedIds = [...expandedIds]
                // moveNode = treeNodeMap[data.moveNode.nodeId];
            } 
        } else if (type === "rename") {
            let targetNode = data.targetNode;
            targetNode.name = data.newName;
            treeNodes = treeNodes;
            treeNodeMap[targetNode.nodeId] = targetNode;

            // let parentNode = treeNodeMap[targetNode.parent_nodeId]
            // updateTreeNodeMap(parentNode.children, targetNode.parent_nodeId);
        } //else if (type === "delete") {}
    }

    /**
     * id 和 treeNode 的映射 ，在每一次 treeNodes 更新的时候调用
     * @param nodes
     */
    function updateTreeNodeMap(nodes = [], parent_nodeId = "") {
        nodes.forEach((node) => {
            treeNodeMap[node.nodeId] = node;
            node["parent_nodeId"] = parent_nodeId;
            if (parent_nodeId.toString().length > 0) {
                let parentTreePathArr =
                    treeNodeMap[parent_nodeId]["tree_path_arr"];
                node["tree_path_arr"] = [...parentTreePathArr, node.nodeId];
            } else {
                node["tree_path_arr"] = [node.nodeId];
            }

            if (node.children && node.children.length > 0) {
                console.log("updateTreeNodeMap -> children");
                updateTreeNodeMap(node.children, node.nodeId);
            }
        });
    }

    let expandedIds = [];
    let oldExpandedIds = [];
    let actions = [
        { type: "more", icon: "iconMore", title: "more", callback: moreClick },
    ];

    let openLogin;

    openLoginFun.set(() => {
        plugin.loginTab = plugin.openBoardMixTab({
            tabType: TAB_TYPE,
            name: "查看登录",
            url: "https://boardmix.cn/user/login",
            showCookieButton: true,
        });
    });

    openLoginFun.subscribe((fun) => (openLogin = fun));
</script>

<Dock title="BoardMix目录树" icon="boardmix_whiteboard" name="testDocks">
    <div slot="actions">
        <span
            data-type="min"
            class="block__icon b3-tooltips b3-tooltips__sw"
            aria-label="最小化"
            ><svg><use xlink:href="#iconMin"></use></svg></span
        >
    </div>
    <div slot="content">
        <div class="button_box">
            <Button label="刷新树" on:click={refreshTree}></Button>
            <Button label="查看登录" on:click={openLogin}></Button>
        </div>

        <Tree
            {treeNodes}
            {actions}
            {expandedIds}
            on:nodeClick={nodeClick}
            on:expandedChange={expandedChange}
        />
    </div>
</Dock>

<style>
    .button_box {
        text-align: center;
    }
    /* .button_box button {
        width: 80px;
    } */
</style>
