import * as utils from './utils.js'; 
import * as main from './script.mjs'; 


/**
 * Build Menu to be used in the html
 */
export function menuBuilder( parentComponent ) {
    parentComponent.innerHTML = 'TODO: Build menu editor.<br/>currently, please set menus using json files (admin/menus)';
    return;
    parentComponent.innerHTML = `<div id='menuEditor'>
                                    <ul>
                                        <li draggable=true>aaa</li>
                                        <li draggable=true>bbb</li>
                                        <li draggable=true>ccc</li>
                                        <li draggable=true>ddd</li>
                                        <li ondrop="console.log(event)" >111</li>
                                    </ul>
                                </div>`;
    let draggedElement = null;
    let overElement = null;
    document.querySelectorAll('#menuEditor > ul > li').forEach( menuItem => {
        menuItem.ondragstart = event => {
            draggedElement = event.target;
        }

        menuItem.ondragleave = event => {
            console.log(overElement);
            let dropIndex = 0;
            let draggedIndex = 0;
            document.querySelectorAll('#menuEditor ul > li').forEach( (elem, i) => {
                if ( elem == draggedElement ) draggedIndex = i;
                if ( elem == overElement ) dropIndex = i;
            });
        }

        menuItem.ondragover = event => {
            if ( event.currentTarget == draggedElement ) return;
            overElement = event.currentTarget;
        }
    });


    function allowDrop(ev) {
        ev.preventDefault();
    }
        
    function drag(ev) {
        ev.dataTransfer.setData("text", ev.target.id);
    }
        
    function drop(ev) {
        ev.preventDefault();
        var data = ev.dataTransfer.getData("text");
        ev.target.appendChild(document.getElementById(data));
    }
}