<script lang="ts">
  import { Tree } from "siyuan-kit-svelte";
  import { onDestroy, onMount } from "svelte";
  import {
    getFolder,
    getTeams,
    getProjects,
    getSpaceConfig
  } from "@/libs/boardmix-api";
  import { pushErrMsg } from "@/libs/api";

  export let treeNodes = [];
  export let srcNode;

  let actions = [
    { type: "move", icon: "iconMove", title: "move", callback: moveClick },
  ];
  let expandedIds = [];
  let oldExpandedIds = [];
  let treeNodeMap = {};
  let vir_node = {
    type: "vir_node",
    name: "加载中...",
    nodeId: "vir_node",
    icon: "iconFile",
  };
  export let callMove;
  onMount(async () => {
    refreshTree();
  });

  onDestroy(() => {});

  function nodeClick() {}

  function moveClick(targetNode, e) {
    console.log(targetNode, e);
    let type = targetNode.type;
    if (type === "project" || type === "folder") {
      callMove(targetNode);
    } else {
      pushErrMsg("只能移动到项目(根目录)或文件夹");
      return;
    }
  }

  async function expandedChange(e) {
    let { toggleNodeId, isExpanded } = getCurrToggle(e.detail);
    let toggleNode = treeNodeMap[toggleNodeId];
    let hasVirtualNode =
      toggleNode.children &&
      toggleNode.children.some((item) => item.type === "vir_node");
    if (isExpanded && hasVirtualNode) {
      await updateChildren(toggleNode);
    }
  }

  //更新子节点
  async function updateChildren(targetNode) {
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
      children = folderRes.map((item) => {
        let node: any = {
          type: "folder",
          name: item.name,
          team_id: item.team_id,
          project_id: item.project_id,
          nodeId: item.id,
          icon: "iconFolder",
        };
        if (item.folder_count > 0) {
          node.children = [Object.assign({}, vir_node)];
        }

        return node;
      });
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

        if (item.folder_count > 0) {
          //item.file_count > 0 ||
          node.children = [Object.assign({}, vir_node)];
        }
        return node;
      });
    }

    updateTreeNodes("update_children", {
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

  async function refreshTree() {
    //关闭所有展开的节点
    expandedIds = [];
    oldExpandedIds = [];
    // await genBoardmixHeader();
    let spaceRes = await getSpaceConfig();
    let { project_id, team_id } = spaceRes;
    console.log(project_id);
    console.log(team_id);

    //获取团队
    let teamRes = [];
    if (srcNode.type === "file") {
      // 文件可以移动到其他团队，文件夹不能移
      teamRes = await getTeams();
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
    }

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
      if (item.folder_count > 0) {
        //item.file_count > 0 ||
        node.children = [Object.assign({}, vir_node)];
      }

      return node;
    });

    //更新 treeNotes 节点
    updateTreeNodes("equals", {
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
  }

  /**
   * 更新TreeNodes , 同时更新treeNodeMap
   */
  function updateTreeNodes(type, data) {
    if (type === "equals") {
      treeNodes = data.nodes;
      updateTreeNodeMap(data.nodes);
      console.log(treeNodeMap);
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
    }
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
        let parentTreePathArr = treeNodeMap[parent_nodeId]["tree_path_arr"];
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
</script>

<div>
  <p>移动后可能需重新展开树</p>
  <Tree
  {treeNodes}
  {actions}
  {expandedIds}
  on:nodeClick={nodeClick}
  on:expandedChange={expandedChange}
/>
</div>


<style>
</style>
