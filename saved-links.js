document.addEventListener('DOMContentLoaded', function() {
    const linksContainer = document.getElementById('linksContainer');
    const searchInput = document.getElementById('searchInput');
    const exportButton = document.getElementById('exportButton');
    const clearAllButton = document.getElementById('clearAllButton');
    const deleteSelectedButton = document.getElementById('deleteSelectedButton');
    const noLinksMessage = linksContainer ? linksContainer.querySelector('.no-links') : null;
    const tagListContainer = document.getElementById('tagList');
    const linkCountDisplay = document.getElementById('linkCount');
    const sortOptions = document.getElementById('sortOptions');

    const editModal = document.getElementById('editModal');
    const closeButton = editModal ? editModal.querySelector('.close') : null;
    const editForm = document.getElementById('editForm');
    const editNoteInput = document.getElementById('editNote');
    const editTagsInput = document.getElementById('editTags');
    const editUrlInput = document.getElementById('editUrl');
    const cancelEditButton = document.getElementById('cancelEditButton');
    
    let allLinks = [];
    let currentTagFilter = null;

    const noSearchResultsMessage = document.createElement('div');
    noSearchResultsMessage.className = 'no-search-results';
    noSearchResultsMessage.innerHTML = 'No links found for your search query. <span class="clear-search">Clear search</span> to see all links.';
    noSearchResultsMessage.style.textAlign = 'center';
    noSearchResultsMessage.style.marginTop = '20px';
    noSearchResultsMessage.style.color = 'var(--secondary-text-color)';
    noSearchResultsMessage.style.display = 'none';

    if (noSearchResultsMessage.querySelector('.clear-search')) {
        noSearchResultsMessage.querySelector('.clear-search').addEventListener('click', () => {
            searchInput.value = '';
            filterAndRender();
        });
    }

    chrome.storage.local.get('theme', function(data) {
        if (data.theme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    });
    
    function updateLinkCount() {
        if (!linkCountDisplay) return;
        const totalLinks = allLinks.length;
        const displayedLinks = linksContainer.querySelectorAll('.link-card').length;
        if (totalLinks === displayedLinks || displayedLinks === 0) {
            linkCountDisplay.textContent = `${totalLinks} Links Saved`;
        } else {
            linkCountDisplay.textContent = `${displayedLinks} of ${totalLinks} Links Displayed`;
        }
    }

    function renderTags() {
        if (!tagListContainer) return;
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
    
    function sortLinks(links, sortBy) {
        if (!sortBy) return links;

        const [property, order] = sortBy.split('-');

        return links.sort((a, b) => {
            let aValue, bValue;

            if (property === 'date') {
                aValue = new Date(a.date);
                bValue = new Date(b.date);
            } else if (property === 'url') {
                aValue = a.url.toLowerCase();
                bValue = b.url.toLowerCase();
            } else if (property === 'note') {
                aValue = (a.note || '').toLowerCase();
                bValue = (b.note || '').toLowerCase();
            }

            if (aValue < bValue) return order === 'asc' ? -1 : 1;
            if (aValue > bValue) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function renderLinks(links) {
        if (!linksContainer) return;
        linksContainer.innerHTML = '';

        if (links.length === 0) {
            if (allLinks.length === 0) {
                if (noLinksMessage) {
                    linksContainer.appendChild(noLinksMessage);
                    noLinksMessage.style.display = 'block';
                }
                noSearchResultsMessage.style.display = 'none';
            } else {
                linksContainer.appendChild(noSearchResultsMessage);
                if (noLinksMessage) {
                    noLinksMessage.style.display = 'none';
                }
                noSearchResultsMessage.style.display = 'block';
            }
        } else {
            if (noLinksMessage) {
                noLinksMessage.style.display = 'none';
            }
            noSearchResultsMessage.style.display = 'none';

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

                const hasNote = link.note && link.note.trim() !== '';

                if (hasNote) {
                    title.textContent = link.note;
                } else {
                    title.textContent = 'No Notes';
                }
                linkContent.appendChild(title);

                const url = document.createElement('div');
                url.className = 'link-url';
                const maxLength = 60;
                
                const truncatedUrl = link.url.length > maxLength ? link.url.substring(0, maxLength) + '...' : link.url;

                const urlLink = document.createElement('a');
                urlLink.href = link.url;
                urlLink.target = '_blank';
                urlLink.rel = 'noopener noreferrer';
                urlLink.textContent = truncatedUrl;
                urlLink.title = link.url;
                url.appendChild(urlLink);

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
                
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-link';
                copyButton.textContent = 'Copy';
                copyButton.addEventListener('click', () => {
                    const textToCopy = `Title: ${link.note || link.url}\nURL: ${link.url}\nTags: ${link.tags.join(', ')}`;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        alert('Link details copied to clipboard!');
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                    });
                });
                
                const editButton = document.createElement('button');
                editButton.className = 'edit-link';
                editButton.textContent = 'Edit';
                editButton.addEventListener('click', () => {
                    const originalIndex = allLinks.findIndex(l => l.url === link.url);
                    openEditModal(originalIndex);
                });

                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-link';
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => {
                    const linkUrl = link.url;
                    if (confirm(`Are you sure you want to delete the link:\n${link.note || linkUrl}\n\nThis cannot be undone.`)) {
                        allLinks = allLinks.filter(l => l.url !== linkUrl);
                        chrome.storage.local.set({ savedLinks: allLinks }, filterAndRender);
                    }
                });

                actions.appendChild(visitLink);
                actions.appendChild(copyButton);
                actions.appendChild(editButton);
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
        if (deleteSelectedButton) {
            deleteSelectedButton.style.display = checkedBoxes.length > 0 ? 'block' : 'none';
        }
    }

    function bulkDeleteLinks() {
        const checkedBoxes = linksContainer.querySelectorAll('.link-checkbox:checked');
        if (checkedBoxes.length === 0) return;
        
        if (confirm(`Are you sure you want to delete ${checkedBoxes.length} selected link(s)?`)) {
            const urlsToDelete = Array.from(checkedBoxes).map(cb => {
                const linkCard = cb.closest('.link-card');
                const urlElement = linkCard.querySelector('.link-url a');
                return urlElement ? urlElement.href : null;
            }).filter(url => url !== null);
            
            allLinks = allLinks.filter(link => !urlsToDelete.includes(link.url));
            
            chrome.storage.local.set({ savedLinks: allLinks }, function() {
                if (!chrome.runtime.lastError) {
                    filterAndRender();
                    if (deleteSelectedButton) {
                        deleteSelectedButton.style.display = 'none';
                    }
                }
            });
        }
    }

    function getFilteredLinks() {
        let filtered = [...allLinks]; // Create a copy to sort

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        
        if (searchTerm) {
            if (searchTerm.startsWith('#')) {
                const tagSearchTerm = searchTerm.substring(1).trim();
                filtered = filtered.filter(link => link.tags.some(tag => tag.toLowerCase().includes(tagSearchTerm)));
            } else {
                filtered = filtered.filter(link => {
                    const searchString = `${link.note} ${link.url} ${link.tags.join(' ')}`.toLowerCase();
                    return searchString.includes(searchTerm);
                });
            }
        }
        
        if (currentTagFilter) {
            filtered = filtered.filter(link => link.tags.includes(currentTagFilter));
        }
        
        const sortBy = sortOptions ? sortOptions.value : 'date-desc';
        return sortLinks(filtered, sortBy);
    }

    function filterAndRender() {
        const filteredLinks = getFilteredLinks();
        renderTags();
        renderLinks(filteredLinks);
    }

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
    
    function clearAllLinks() {
        if (confirm("Are you sure you want to delete ALL saved links? This cannot be undone.")) {
            chrome.storage.local.set({ savedLinks: [] }, function() {
                allLinks = [];
                currentTagFilter = null;
                if (searchInput) {
                    searchInput.value = '';
                }
                filterAndRender();
            });
        }
    }
    
    function openEditModal(originalIndex) {
        if (originalIndex === -1) return;
        const linkToEdit = allLinks[originalIndex];
        if (editForm && editNoteInput && editTagsInput && editUrlInput) {
            editForm.dataset.index = originalIndex;
            editNoteInput.value = linkToEdit.note || '';
            editTagsInput.value = linkToEdit.tags.join(', ');
            editUrlInput.value = linkToEdit.url;
            editModal.style.display = 'block';
            setTimeout(() => editModal.classList.add('show'), 10);
        }
    }

    function closeEditModal() {
        if (editModal) {
            editModal.classList.remove('show');
            setTimeout(() => editModal.style.display = 'none', 300);
        }
    }
    
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const originalIndex = editForm.dataset.index;
            const editedNote = editNoteInput.value.trim();
            const editedTags = editTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            const editedUrl = editUrlInput.value.trim();
            
            if (originalIndex !== null && originalIndex !== -1) {
                allLinks[originalIndex].note = editedNote;
                allLinks[originalIndex].tags = editedTags;
                allLinks[originalIndex].url = editedUrl;
                
                chrome.storage.local.set({ savedLinks: allLinks }, function() {
                    if (!chrome.runtime.lastError) {
                        filterAndRender();
                        closeEditModal();
                    }
                });
            }
        });
    }

    // Initial render
    chrome.storage.local.get({ savedLinks: [] }, function(data) {
        allLinks = data.savedLinks;
        filterAndRender();
    });

    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentTagFilter = null;
            filterAndRender();
        });
    }
    if (sortOptions) {
        sortOptions.addEventListener('change', filterAndRender);
    }
    if (exportButton) {
        exportButton.addEventListener('click', exportLinksAsJSON);
    }
    if (clearAllButton) {
        clearAllButton.addEventListener('click', clearAllLinks);
    }
    if (deleteSelectedButton) {
        deleteSelectedButton.addEventListener('click', bulkDeleteLinks);
    }
    if (closeButton) {
        closeButton.addEventListener('click', closeEditModal);
    }
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', closeEditModal);
    }
    if (editModal) {
        window.addEventListener('click', (event) => {
            if (event.target == editModal) {
                closeEditModal();
            }
        });
    }
});