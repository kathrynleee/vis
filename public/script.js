let cy
let selectedClass, selectedPackage, selectedVersion, versionToCompare
let versionElements = []
let level = 'system'
let dependencyLevel = 1
let roleMap = new Map([
    ['Controller', '#755194'], ['Coordinator', '#539967'],
    ['Interfacer', '#E9AB45'], ['Information Holder', '#bf3f6a'],
    ['Service Provider', '#4d82b0'], ['Structurer', '#e6a1b2']
])

document.addEventListener('DOMContentLoaded', () => {
    // axios.baseURL = 'localhost:3000'
    axios.baseURL = 'https://visdemo.herokuapp.com'
    createVersionList()
    createGraph()
    createLegend()
    createTimeline()
})

const createLegend = () => {
    let element, sub, text
    for (let role of roleMap.keys()) {
        element = document.createElement('div')
        element.className = 'legendRole'
        sub = document.createElement('div')
        sub.className = 'legendCircle'
        sub.addEventListener('mouseover', () => {
            hoverLegend(role)
        })
        sub.addEventListener('mouseout', () => {
            removeHoverLegend()
        })
        sub.style['background-color'] = roleMap.get(role)
        element.appendChild(sub)
        text = document.createElement('div')
        text.className = 'legendText'
        text.innerHTML = role
        element.appendChild(text)
        document.getElementById('legend').appendChild(element)
    }
}

const removeHoverLegend = () => {
    cy.elements().removeClass('hover')
}

const hoverLegend = (role) => {
    const nodes = cy.elements(`node[role="${role}"]`)
    const parents = nodes.ancestors()
    cy.elements().not(nodes).not(parents).addClass('hover')
}

const clearInfo = () => {
    document.getElementById('selected').innerHTML = ''
    document.getElementById('roles').innerHTML = ''
}

const createTimeline = async (id) => {
    clearInfo()
    const versions = await getVersions()
    if(level === 'class') {
        const roleList = await getClassRoleList(id)
        let element, span, role
        document.getElementById('selected').innerHTML = id
        _.forEach(versions.data, v => {
            element = document.createElement('div')
            span = document.createElement('span')
            const node = _.find(roleList.data, ['data.version', v])
            if(node == undefined) {
                element.style['background-color'] = '#a9b6c2'
            } else {
                role = node.data.role
                element.style['background-color'] = roleMap.get(role)
                span.addEventListener('click', () => {
                    showChanges(v)
                    span.className += 'comparedVersionSelected'
                })
            }
            element.className = 'role'
            span.className = 'tooltip'
            span.setAttribute('data-text', v.slice(0, 10))
            element.appendChild(span)
            document.getElementById('roles').appendChild(element)
        })
    } else if(level === 'package') {
        document.getElementById('selected').innerHTML = id
        const roleList = await getPackageRoleList(id)
        let element, span
        _.forEach(versions.data, v => {
            const list = _.find(roleList.data, ['version', v])
            element = document.createElement('div')
            span = document.createElement('span')
            if(list.role.length === 0) {
                element.style['background-color'] = '#a9b6c2'
            } else if(list.role.length === 1) {
                element.style['background-color'] = roleMap.get(list.role[0])
                span.addEventListener('click', () => {
                    showChanges(v)
                })
            } else if(list.role.length === 2) {
                let color1 = roleMap.get(list.role[0])
                let color2 = roleMap.get(list.role[1])
                element.style['background-image'] = `linear-gradient(to right, ${color1} 50%, ${color2} 50%)`
                span.addEventListener('click', () => {
                    showChanges(v)
                })
            } else {
                let style = 'linear-gradient(to right'
                _.forEach(list.role, (r, i) => {
                    let color = roleMap.get(r)
                    let size = _.round(100 / list.role.length, 2)
                    style += `, ${color} ${size * i}%,  ${color} ${size * (i+1)}%`
                })
                style += ')'
                element.style['background-image'] = style
                span.addEventListener('click', () => {
                    showChanges(v)
                })
            }
            element.className = 'role'
            span.className = 'tooltip'
            span.setAttribute('data-text', v.slice(0, 10))
            element.appendChild(span)
            document.getElementById('roles').appendChild(element)
        })
    } else {
        document.getElementById('selected').innerHTML = selectedVersion
        const roleList = await getSystemRoleList()
        let element, span
        _.forEach(versions.data, v => {
            const list = _.find(roleList.data, ['version', v])
            element = document.createElement('div')
            if(list.role.length === 1) {
                element.style['background-color'] = roleMap.get(list.role[0])
            } else if(list.role.length === 2) {
                let color1 = roleMap.get(list.role[0])
                let color2 = roleMap.get(list.role[1])
                element.style['background-image'] = `linear-gradient(to right, ${color1} 50%, ${color2} 50%)`
            } else {
                let style = 'linear-gradient(to right'
                _.forEach(list.role, (r, i) => {
                    let color = roleMap.get(r)
                    let size = _.round(100 / list.role.length, 2)
                    style += `, ${color} ${size * i}%,  ${color} ${size * (i+1)}%`
                })
                style += ')'
                element.style['background-image'] = style
            }
            span = document.createElement('span')
            span.addEventListener('click', () => {
                showChanges(v)
            })
            element.className = 'role'
            span.className = 'tooltip'
            span.setAttribute('data-text', v.slice(0, 10))
            element.appendChild(span)
            document.getElementById('roles').appendChild(element)
        })
    }
}

const updateVersion = async () => {
    selectedVersion = document.getElementById('versionList').value
    clearInfo()
    createTimeline()
    const elements = await getElements(selectedVersion)
    versionElements = elements.data
    cy.remove(cy.elements())
    cy.add(elements.data)
    cy.layout(options).run()
}

const showChanges = async (v) => {
    versionToCompare = v
    const versions = await getVersions()
    if(versionToCompare !== selectedVersion) {
        toggleChangesDialogBox(true)
        let changes
        switch(level) {
            case 'system':
                changes = await getSystemChangesList(versionToCompare)
                break
            case 'package':
                changes = await getPackageChangesList(versionToCompare)
                break
            case 'class':
                changes = await getClassChangesList(versionToCompare)
                break
        }
        const currentIndex = _.indexOf(versions.data, selectedVersion)
        const targetIndex = _.indexOf(versions.data, versionToCompare)
        if(currentIndex < targetIndex) {
            _.forEach(changes.data.nodes.inCompared, d => d.data['status'] = 'added')
            _.forEach(changes.data.edges.inCompared, d => d.data['status'] = 'added')
        } else {
            _.forEach(changes.data.nodes.inCompared, d => d.data['status'] = 'removed')
            _.forEach(changes.data.edges.inCompared, d => d.data['status'] = 'removed')
        }
        cy.startBatch()
        cy.remove(cy.elements())
        cy.add(versionElements)
        cy.add(changes.data.nodes.inCompared)
        cy.add(changes.data.edges.inCompared)
        if(currentIndex < targetIndex){
            cy.elements('[status="added"]').addClass('added')
            _.forEach(changes.data.nodes.inCurrent, d => 
                cy.$id(d.data.id).addClass('removed')
            )
            _.forEach(changes.data.edges.inCurrent, d => 
                cy.elements('edge[source="' + d.data.source + '"][target="' + d.data.target + '"]').addClass('removed')
            )
        } else {
            cy.elements('[status="removed"]').addClass('removed')
            _.forEach(changes.data.nodes.inCurrent, d => 
                cy.$id(d.data.id).addClass('added')
            )
            _.forEach(changes.data.edges.inCurrent, d => 
                cy.elements('edge[source="' + d.data.source + '"][target="' + d.data.target + '"]').addClass('added')
            )
        }
        cy.endBatch()
        updateGraph()
        updateChangesList('removed')
    } else {
        toggleChangesDialogBox(false)
        cy.remove(cy.elements())
        cy.add(versionElements)
        updateGraph()
    }
}

const updateGraph = () => {
    switch(level) {
        case 'system':
            document.getElementById('labelVisibility').value = 'hideLabel'
            cy.layout(options).run()
            break
        case 'package':
            updatePackageGraph()
            break
        case 'class':
            updateClassGraph()
            break
    }
}

const createGraph = async () => {
    updateElementsVisibility()
    const versions = await getVersions()
    const versionIndex = versions.data.length - 1
    selectedVersion = versions.data[versionIndex]
    document.getElementById('versionList').value = selectedVersion
    const elements = await getElements(selectedVersion)
    versionElements = elements.data
    const styles = await getStyles()

    cy = cytoscape({
        container: document.getElementById('cy'),
        layout: options,
        minZoom: 0.1,
        hideEdgesOnViewport: true,
        motionBlur: true,
        boxSelectionEnabled: true,
        style: styles.data.style,
        elements: elements.data,
        ready: function() {
            this.on('click', (e)  => {
                toggleChangesDialogBox(false)
                const target = e.target
                if (target === cy) {
                    document.getElementById('filterOptions').style.display = 'flex'
                    clearInfo()
                    createTimeline()
                    level = 'system'
                    updateElementsVisibility()
                    selectedClass = ''
                    selectedPackage = ''
                    cy.remove(cy.elements())
                    cy.add(versionElements)
                    cy.layout(options).run()
                }
            })
            this.on('tap', 'node', async (e) => {
                let target = e.target
                const selected = target._private.data.id
                const version = target._private.data.version
                if(version !== selectedVersion) {
                    const elements = await getElements(version)
                    versionElements = elements.data
                    document.getElementById('versionList').value = version
                    selectedVersion = version
                    cy.remove(cy.elements())
                    cy.add(versionElements)
                    target = cy.$id(selected)
                } else {
                    cy.remove(cy.elements())
                    cy.add(versionElements)
                    target = cy.$id(selected)
                }
                if(target.isParent()) {
                    level = 'package'
                    updateElementsVisibility()
                    selectedPackage = selected
                    createTimeline(selected)
                    updateGraph()
                } else {
                    level = 'class'
                    updateElementsVisibility()
                    selectedClass = selected
                    createTimeline(selected)
                    updateGraph()
                }
            })
            this.on('mouseover', 'node', (e) => {
                const target = e.target
                const choice = document.getElementById('labelVisibility').value
                if(choice === 'hideLabel') {
                    target.addClass('showLabel')
                }
            })
            this.on('mouseout', 'node', (e) => {
                const target = e.target
                const choice = document.getElementById('labelVisibility').value
                if(choice === 'hideLabel') {
                    target.removeClass('showLabel')
                }
            })
        }
    })
}

const createVersionList = async () => {
    const versions = await getVersions()
    const select = document.getElementById('versionList')
    versions.data.forEach(v => {
        let option = document.createElement('option')
        option.innerHTML = v.slice(0, 10)
        option.value = v
        select.append(option)
    })
    const versionIndex = versions.data.length - 1
    selectedVersion = versions.data[versionIndex]
}

const options = {
    name: 'klay',
    nodeDimensionsIncludeLabels: true, 
    fit: true,
    animate: 'end',
    animationDuration: 500,
    animationEasing: 'spring(500, 50)',
    klay: {
        borderSpacing: 20, // spacing between compound nodes
        spacing: 15, // spacing between nodes
        compactComponents: true,
        nodePlacement:'SIMPLE',
        direction: 'DOWN',
        edgeRouting: 'POLYLINE',
        edgeSpacingFactor: 0.3,
        layoutHierarchy: false
    },
    // stop: () => console.log('layout completed')
}

const hierarchy = () => {
    const hierarchyOptions = _.cloneDeep(options)
    hierarchyOptions.klay.layoutHierarchy = true
    cy.layout(hierarchyOptions).run()
}

const resetLayout = () => {
    cy.layout(options).run()
}

const resizeNodes = () => {
    cy.nodes().style({
        'height' : (node) => {
            let loc = _.toInteger(node.data('loc'))
            let size = 5 * _.round(Math.sqrt(loc))
            return size
        },
        'width' : (node) => {
            let loc = _.toInteger(node.data('loc'))
            let size = 5 *  _.round(Math.sqrt(loc))
            return size
        }
    })
    cy.layout(options).run()
}

const setRole = () => {
    cy.elements().removeClass('hide')
    document.getElementById('labelVisibility').value = 'showLabel'
    let fromRole = document.getElementById('fromRole').value
    let toRole = document.getElementById('toRole').value
    let fromNodes = [], toNodes = []
    fromNodes = (fromRole === '') ? cy.nodes() : cy.elements(`node[role="${fromRole}"]`)
    toNodes = (toRole === '') ? cy.nodes() : cy.elements(`node[role="${toRole}"]`)
    cy.startBatch()
    const edges = fromNodes.edgesTo(toNodes)
    const nodes = edges.connectedNodes()
    const parents = nodes.ancestors()
    nodes.addClass('showLabel')
    cy.elements().not(edges).not(nodes).not(parents).addClass('hide')
    cy.layout(options).run()
    cy.endBatch()
}

const toggleLabelVisibility = () => {
    let labelVisibility = document.getElementById('labelVisibility').value
    if(labelVisibility === 'showLabel') {
        cy.nodes().addClass('showLabel')
    } else {
        cy.nodes().removeClass('showLabel')
    }
    cy.layout(options).run()
}

const updateDependencyLevel = (lvl) => {
    dependencyLevel = lvl
    if(level === 'class') {
        updateClassGraph()
    }
}

const updateClassGraph = () => {
    const target = cy.$id(selectedClass).addClass('selected')
    cy.startBatch()
    cy.elements().removeClass('hide')
    // first level edges and nodes
    const edges = target.connectedEdges()
    const nodes = edges.connectedNodes().union(target)
    edges.style({
        'width' : '3'
    })
    let nodeList = nodes , edgeList = edges, parents = nodes.ancestors()
    let secondLvlEdges = [], secondLvlNodes = [], thirdLvlEdges = [], thirdLvlNodes = []
    if(dependencyLevel > 1) {
        edges.style({
            'width' : '13'
        })
        // second level edges
        secondLvlEdges = nodes.connectedEdges().not(edges)
        secondLvlNodes = secondLvlEdges.connectedNodes()
        secondLvlEdges.style({
            'width' : '7',
            'opacity' : '0.8'
        })
        parents = nodes.ancestors().union(secondLvlNodes.ancestors())
        nodeList = nodes.union(secondLvlNodes)
        edgeList = edges.union(secondLvlEdges)
    }
    if(dependencyLevel === 3) {
        // third level edges
        thirdLvlEdges = secondLvlNodes.connectedEdges().not(edges).not(secondLvlEdges)
        thirdLvlNodes = thirdLvlEdges.connectedNodes()
        thirdLvlEdges.style({
            'width' : '3',
            'opacity' : '0.6'
        })
        parents = nodes.ancestors().union(secondLvlNodes.ancestors()).union(thirdLvlNodes.ancestors())
        nodeList = nodes.union(secondLvlNodes).union(thirdLvlNodes)
        edgeList = edges.union(secondLvlEdges).union(thirdLvlEdges)
    }
    nodeList.addClass('showLabel')
    cy.elements().not(nodeList).not(edgeList).not(parents).addClass('hide')
    cy.endBatch()
    cy.layout(options).run()
}

const updatePackageGraph = () => {
    cy.startBatch()
    const target = cy.$id(selectedPackage)
    const nodes = target.union(target.descendants())
    const parents = target.ancestors()
    const edges = nodes.connectedEdges()
    nodes.addClass('showLabel')
    cy.elements().not(nodes).not(parents).not(edges).addClass('hide')
    cy.endBatch()
    cy.layout(options).run()
}

const updateChangesList = async (type) => {
    document.getElementById('classList').innerHTML = ''
    const versions = await getVersions()
    let changes = {}
    switch(level) {
        case 'system':
            changes = await getSystemChangesList(versionToCompare)
            break
        case 'package':
            cy.nodes().addClass('showLabel')
            changes = await getPackageChangesList(versionToCompare)
            break
        case 'class':
            cy.nodes().addClass('showLabel')
            changes = await getClassChangesList(versionToCompare)
            break
    }
    const currentIndex = _.indexOf(versions.data, selectedVersion)
    const targetIndex = _.indexOf(versions.data, versionToCompare)
    let removedItems = [], addedItems = []
    if(currentIndex < targetIndex){
        removedItems = changes.data.nodes.inCurrent
        addedItems = changes.data.nodes.inCompared
    } else {
        removedItems = changes.data.nodes.inCompared
        addedItems = changes.data.nodes.inCurrent
    }

    switch(type) {
        case 'removed':
            cy.startBatch()
            cy.elements('.removed').removeClass('hide')
            cy.elements().removeClass('faded')
            cy.elements('.changedRole').removeClass(['Controller', 'Coordinator', 'Interfacer', 'InformationHolder', 'ServiceProvider', 'Structurer'])
            cy.elements().removeClass('changedRole')
            cy.endBatch()
            document.getElementById('classList').innerHTML = 'Compare with<br>' + versionToCompare + '<br><br>' + 'Removed classes:<br>'
            removedItems.forEach(c => {
                let element, sub, text
                element = document.createElement('div')
                element.className = 'listItem'
                element.addEventListener('click', () => {
                    clickChangesListItem(c.data.id)
                })
                sub = document.createElement('div')
                sub = document.createElement('div')
                if(c.data.role === undefined) {
                    sub.className = 'listItemPackage'
                } else {
                    sub.className = 'listItemCircle'
                    sub.style['background-color'] = roleMap.get(c.data.role)
                }
                element.appendChild(sub)
                text = document.createElement('div')
                text.className = 'listItemText'
                text.innerHTML = c.data.id
                element.appendChild(text)
                document.getElementById('classList').appendChild(element)
            })
            break
        case 'added':
            cy.startBatch()
            cy.elements().removeClass('faded')
            cy.elements('.removed').addClass('hide')
            cy.elements().not('.added').not('.removed').addClass('faded')
            cy.elements('.changedRole').removeClass(['Controller', 'Coordinator', 'Interfacer', 'InformationHolder', 'ServiceProvider', 'Structurer'])
            cy.elements().removeClass('changedRole')
            cy.endBatch()
            document.getElementById('classList').innerHTML = 'Compare with<br>' + versionToCompare + '<br><br>' + 'Added classes:<br>'
            addedItems.forEach(c => {
                let element, sub, text
                element = document.createElement('div')
                element.className = 'listItem'
                element.addEventListener('click', () => {
                    clickChangesListItem(c.data.id)
                })
                sub = document.createElement('div')
                if(c.data.role === undefined) {
                    sub.className = 'listItemPackage'
                } else {
                    sub.className = 'listItemCircle'
                    sub.style['background-color'] = roleMap.get(c.data.role)
                }
                element.appendChild(sub)
                text = document.createElement('div')
                text.className = 'listItemText'
                text.innerHTML = c.data.id
                element.appendChild(text)
                document.getElementById('classList').appendChild(element)
            })
            break
        case 'changed':
            cy.startBatch()
            cy.elements().removeClass(['changedRole', 'faded'])
            cy.elements('.removed').addClass('hide')
            changes.data.changedRoles.forEach(n => {
                let fromRole = n[versionToCompare]
                fromRole = fromRole.replace(/\s+/g, '')
                cy.$id(n.id).addClass(['changedRole', fromRole])
            })
            cy.endBatch()
            document.getElementById('classList').innerHTML = 'Compare with<br>' + versionToCompare + '<br><br>' + 'Role-changed classes:<br>'
            changes.data.changedRoles.forEach(c => {
                let element, from, to, text
                element = document.createElement('div')
                element.className = 'listItem'
                element.addEventListener('click', () => {
                    clickChangesListItem(c.id)
                })
                if(currentIndex < targetIndex){
                    from = document.createElement('div')
                    from.className = 'listItemCircle fromRoleCircle'
                    from.style['background-color'] = roleMap.get(c[`${selectedVersion}`])
                    element.appendChild(from)
                    to = document.createElement('div')
                    to.className = 'listItemCircle'
                    to.style['background-color'] = roleMap.get(c[`${versionToCompare}`])
                    element.appendChild(to)
                } else {
                    from = document.createElement('div')
                    from.className = 'listItemCircle fromRoleCircle'
                    from.style['background-color'] = roleMap.get(c[`${versionToCompare}`])
                    element.appendChild(from)
                    to = document.createElement('div')
                    to.className = 'listItemCircle'
                    to.style['background-color'] = roleMap.get(c[`${selectedVersion}`])
                    element.appendChild(to)
                }
                text = document.createElement('div')
                text.className = 'listItemText'
                text.innerHTML = c.id
                element.appendChild(text)
                document.getElementById('classList').appendChild(element)
            })
            break
    }
    cy.layout(options).run()
}

const clickChangesListItem = (id) => {
    cy.fit()
    if(cy.getElementById(id).hasClass('hide')) {
        updateDependencyLevel(3)
    } 
    cy.zoom({
        level: 1.2,
        position: cy.getElementById(id).position()
    })
}

const updateElementsVisibility = () => {
    toggleChangesDialogBox(false)
    if(level === 'system') {
        document.getElementById('labelVisibility').value = 'hideLabel'
        document.getElementById('dependency').style.display = 'none'
        document.getElementById('filterOptions').style.display = 'flex'
    } else if(level === 'package') {
        document.getElementById('labelVisibility').value = 'showLabel'
        document.getElementById('dependency').style.display = 'none'
        document.getElementById('filterOptions').style.display = 'none'
    } else if(level === 'class') {
        document.getElementById('labelVisibility').value = 'showLabel'
        document.getElementById('dependency').style.display = 'flex'
        document.getElementById('filterOptions').style.display = 'none'
    }
}

const toggleChangesDialogBox = (toShow) => {
    document.getElementById('classList').innerHTML = ''
    if(toShow) {
        document.getElementById('cy').style.width = 'calc(70vw - 30px)'
        document.getElementById('changesDialogBox').style.display = 'block'
    } else {
        document.getElementById('cy').style.width = 'calc(100vw - 30px)'
        document.getElementById('changesDialogBox').style.display = 'none'
    }
}