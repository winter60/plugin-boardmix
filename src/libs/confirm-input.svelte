<script lang="ts">
    import { Button, Input } from "siyuan-kit-svelte";
    export let name = "";
    export let confirmCall;

    function callback() {
        console.log(name);
        confirmCall(name);
    }
</script>

<div id="input_box">
    <div><Input type="text" bind:value={name} /></div>
    <div><Button label="确定" on:click={callback}></Button></div>
</div>

<style>
    #input_box {
        display: flex;
        width: 100%;
    }

    #input_box > div {
        flex: auto;
        text-align: center;
    }
</style>
