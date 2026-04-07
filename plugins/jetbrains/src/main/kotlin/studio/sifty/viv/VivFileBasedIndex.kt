package studio.sifty.viv

import com.intellij.util.indexing.*
import com.intellij.util.io.EnumeratorStringDescriptor

/**
 * File-based index that maps each `.viv` file (keyed by its [com.intellij.openapi.vfs.VirtualFile.getUrl])
 * to a [VivFileIndexData] containing all constructs, includes, enum tokens, function names,
 * and tag names found in that file.
 *
 * The platform invokes the indexer automatically when file content changes, eliminating
 * the need for manual reindex calls scattered across consumers.
 */
class VivFileBasedIndex : FileBasedIndexExtension<String, VivFileIndexData>() {

    companion object {
        val NAME: ID<String, VivFileIndexData> = ID.create("studio.sifty.viv.fileIndex")
        private val EXTERNALIZER = VivFileIndexDataExternalizer()
    }

    override fun getName(): ID<String, VivFileIndexData> = NAME

    override fun getIndexer(): DataIndexer<String, VivFileIndexData, FileContent> =
        DataIndexer { inputData ->
            val psiFile = inputData.psiFile
            if (psiFile is VivFile) {
                val index = VivFileIndexer.indexFile(psiFile, inputData.file)
                mapOf(inputData.file.url to VivFileIndexData(index))
            } else {
                emptyMap()
            }
        }

    override fun getKeyDescriptor(): EnumeratorStringDescriptor = EnumeratorStringDescriptor.INSTANCE

    override fun getValueExternalizer(): VivFileIndexDataExternalizer = EXTERNALIZER

    override fun getInputFilter(): FileBasedIndex.InputFilter =
        DefaultFileTypeSpecificInputFilter(VivFileType.INSTANCE)

    override fun dependsOnFileContent(): Boolean = true

    override fun getVersion(): Int = 1
}
