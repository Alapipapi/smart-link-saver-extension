document.addEventListener('DOMContentLoaded', function() {
    const linksContainer = document.getElementById('linksContainer');
    const searchInput = document.getElementById('searchInput');
    const exportButton = document.getElementById('exportButton');
    const clearAllButton = document.getElementById('clearAllButton');
    const deleteSelectedButton = document.getElementById('deleteSelectedButton');
    const noLinksMessage = linksContainer.querySelector('.no-links');
    const tagListContainer = document.getElementById('tagList');
    const linkCountDisplay = document.getElementById('linkCount');

    const editModal = document.getElementById('editModal');
    const closeButton = editModal.querySelector('.close');
    const editForm = document.getElementById('editForm');
    const editNoteInput = document.getElementById('editNote');
    const editTagsInput = document.getElementById('editTags');
    const editUrlInput = document.getElementById('editUrl'); // Corrected to use the input field
    const cancelEditButton = document.getElementById('cancelEditButton');
    
    let allLinks = [];
    let currentTagFilter = null;

    // Load theme from storage
    chrome.storage.local.get('theme', function(data) {
        if (data.theme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    });
    
    function updateLinkCount() {
        const totalLinks = allLinks.length;
        const displayedLinks = linksContainer.querySelectorAll('.link-card').length;
        if (totalLinks === displayedLinks) {
            linkCountDisplay.textContent = `${totalLinks} Links Saved`;
        } else {
            linkCountDisplay.textContent = `${displayedLinks} of ${totalLinks} Links Displayed`;
        }
    }

    function renderTags() {
        tagListContainer.innerHTML = '';
        if (allLinks.length === 0) {
            tagListContainer.innerHTML = '<p class="no-tags" style="font-style: italic;">No tags found.</p>';
            return;
        }

        const allTags = allLinks.flatMap(link => link.tags);
        const uniqueTags = [...new Set(allTags.filter(tag => tag && tag.trim().length > 0))].sort();

        if (uniqueTags.length === 0) {
            tagListContainer.innerHTML = '<p class="no-tags" style="font-style: italic;">No tags found.</p>';
            return;
        }

        uniqueTags.forEach(tagText => {
            const tagButton = document.createElement('button');
            tagButton.className = 'tag-btn';
            if (currentTagFilter === tagText) {
                tagButton.classList.add('active');
            }
            tagButton.textContent = tagText;
            tagButton.addEventListener('click', () => {
                if (currentTagFilter === tagText) {
                    currentTagFilter = null;
                } else {
                    currentTagFilter = tagText;
                }
                filterAndRender();
            });
            tagListContainer.appendChild(tagButton);
        });
    }

    function renderLinks(links) {
        linksContainer.innerHTML = '';
        if (links.length === 0) {
            linksContainer.appendChild(noLinksMessage);
        } else {
            noLinksMessage.style.display = 'none';
            links.forEach((link, index) => {
                const linkCard = document.createElement('div');
                linkCard.className = 'link-card';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'link-checkbox';
                checkbox.addEventListener('change', toggleBulkDeleteButton);
                linkCard.appendChild(checkbox);
                
                const linkContent = document.createElement('div');
                linkContent.className = 'link-content';

                const title = document.createElement('div');
                title.className = 'link-title';
                title.textContent = link.note || link.url;
                linkContent.appendChild(title);

                const url = document.createElement('div');
                url.className = 'link-url';
                url.textContent = link.url;
                linkContent.appendChild(url);

                if (link.tags && link.tags.length > 0) {
                    const tagsDiv = document.createElement('div');
                    tagsDiv.className = 'link-tags';
                    link.tags.forEach(tagText => {
                        const tag = document.createElement('span');
                        tag.className = 'tag';
                        tag.textContent = tagText;
                        tagsDiv.appendChild(tag);
                    });
                    linkContent.appendChild(tagsDiv);
                }

                const date = document.createElement('div');
                date.className = 'link-date';
                const formattedDate = new Date(link.date).toLocaleString();
                date.textContent = `Saved on: ${formattedDate}`;
                linkContent.appendChild(date);
                
                const actions = document.createElement('div');
                actions.className = 'link-actions';

                const visitLink = document.createElement('a');
                visitLink.href = link.url;
                visitLink.target = '_blank';
                visitLink.className = 'visit-link';
                visitLink.textContent = 'Visit';
                actions.appendChild(visitLink);
                
                const editButton = document.createElement('button');
                editButton.className = 'edit-link';
                editButton.textContent = 'Edit';
                editButton.addEventListener('click', () => {
                    openEditModal(index);
                });
                actions.appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-link';
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => {
                    // Find the original index based on URL to delete from allLinks
                    const originalIndex = allLinks.findIndex(l => l.url === link.url);
                    if (originalIndex > -1) {
                        allLinks.splice(originalIndex, 1);
                        chrome.storage.local.set({ savedLinks: allLinks }, filterAndRender);
                    }
                });
                actions.appendChild(deleteButton);
                
                linkContent.appendChild(actions);
                linkCard.appendChild(linkContent);
                linksContainer.appendChild(linkCard);
            });
        }
        updateLinkCount();
    }
    
    function toggleBulkDeleteButton() {
        const checkedBoxes = linksContainer.querySelectorAll('.link-checkbox:checked');
        if (checkedBoxes.length > 0) {
            deleteSelectedButton.style.display = 'block';
        } else {
            deleteSelectedButton.style.display = 'none';
        }
    }

    function bulkDeleteLinks() {
        const checkedBoxes = linksContainer.querySelectorAll('.link-checkbox:checked');
        if (checkedBoxes.length === 0) return;
        
        if (confirm(`Are you sure you want to delete ${checkedBoxes.length} selected link(s)?`)) {
            const urlsToDelete = Array.from(checkedBoxes).map(cb => {
                const linkCard = cb.closest('.link-card');
                const urlElement = linkCard.querySelector('.link-url');
                return urlElement ? urlElement.textContent : null;
            }).filter(url => url !== null);
            
            allLinks = allLinks.filter(link => !urlsToDelete.includes(link.url));
            
            chrome.storage.local.set({ savedLinks: allLinks }, function() {
                if (!chrome.runtime.lastError) {
                    filterAndRender();
                    deleteSelectedButton.style.display = 'none';
                }
            });
        }
    }

    function getFilteredLinks() {
        let filtered = allLinks;
        const searchTerm = searchInput.value.toLowerCase();
        
        if (searchTerm) {
            filtered = filtered.filter(link => {
                const searchString = `${link.note} ${link.url} ${link.tags.join(' ')}`.toLowerCase();
                return searchString.includes(searchTerm);
            });
        }
        
        if (currentTagFilter) {
            filtered = filtered.filter(link => link.tags.includes(currentTagFilter));
        }
        return filtered;
    }

    function filterAndRender() {
        const filteredLinks = getFilteredLinks();
        renderTags();
        renderLinks(filteredLinks);
    }

    // Function to export links
    function exportLinksAsJSON() {
        const jsonString = JSON.stringify(allLinks, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smart-link-saver-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Function to clear all links with confirmation
    function clearAllLinks() {
        if (confirm("Are you sure you want to delete ALL saved links? This cannot be undone.")) {
            chrome.storage.local.set({ savedLinks: [] }, function() {
                allLinks = [];
                currentTagFilter = null;
                searchInput.value = '';
                filterAndRender();
            });
        }
    }
    
    // Edit Modal Functions
    function openEditModal(index) {
        const filteredLinks = getFilteredLinks();
        const linkToEdit = filteredLinks[index];
        // Find the original index to update the main allLinks array
        const originalIndex = allLinks.findIndex(link => link.url === linkToEdit.url);

        editForm.dataset.index = originalIndex;
        editNoteInput.value = linkToEdit.note;
        editTagsInput.value = linkToEdit.tags.join(', ');
        editUrlInput.value = linkToEdit.url; // Corrected line
        editModal.style.display = 'block';
        setTimeout(() => editModal.classList.add('show'), 10);
    }

    function closeEditModal() {
        editModal.classList.remove('show');
        setTimeout(() => editModal.style.display = 'none', 300);
    }
    
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const originalIndex = editForm.dataset.index;
        const editedNote = editNoteInput.value.trim();
        const editedTags = editTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        const editedUrl = editUrlInput.value.trim();
        
        if (originalIndex !== -1) {
            allLinks[originalIndex].note = editedNote;
            allLinks[originalIndex].tags = editedTags;
            allLinks[originalIndex].url = editedUrl; // Corrected line
            
            chrome.storage.local.set({ savedLinks: allLinks }, function() {
                if (!chrome.runtime.lastError) {
                    filterAndRender();
                    closeEditModal();
                }
            });
        }
    });
    
    // Initial render
    chrome.storage.local.get({ savedLinks: [] }, function(data) {
        allLinks = data.savedLinks;
        filterAndRender();
    });

    // Event listeners
    searchInput.addEventListener('input', () => {
        currentTagFilter = null; // Clear tag filter on search
        filterAndRender();
    });
    exportButton.addEventListener('click', exportLinksAsJSON);
    clearAllButton.addEventListener('click', clearAllLinks);
    deleteSelectedButton.addEventListener('click', bulkDeleteLinks);
    closeButton.addEventListener('click', closeEditModal);
    cancelEditButton.addEventListener('click', closeEditModal);
    window.addEventListener('click', (event) => {
        if (event.target == editModal) {
            closeEditModal();
        }
    });
});