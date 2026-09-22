package io.github.angularwave.android.core.files.util

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import io.github.angularwave.android.core.ng.util.deleteAllFilesInDirectory
import io.github.angularwave.android.core.ng.util.dispatcherProvider
import java.io.File
import java.io.IOException
import kotlinx.coroutines.withContext

class AngularNativeFileProvider : FileProvider() {
    companion object {
        private const val SHARED_DIR = "shared"

        fun authority(context: Context): String {
            return "${context.packageName}.angularNative.fileprovider"
        }

        fun directory(context: Context, dirName: String = SHARED_DIR): File {
            val directory = File(context.filesDir, dirName)

            if (!directory.mkdirs() && !directory.isDirectory) {
                throw IOException("Could not create file provider directory")
            }

            return directory
        }

        fun contentUriForFile(context: Context, file: File): Uri {
            return getUriForFile(context, authority(context), file)
        }

        @Suppress("unused")
        fun uriAttributes(context: Context, uri: Uri): UriAttributes? {
            val uriHelper = UriHelper(context)
            return uriHelper.getAttributes(uri)
        }

        suspend fun writeUriToFile(
            context: Context,
            uri: Uri,
            dirName: String = SHARED_DIR,
        ): File? {
            val uriHelper = UriHelper(context)
            return uriHelper.writeFileTo(uri, directory(context, dirName))
        }

        suspend fun deleteAllFiles(context: Context, dirName: String = SHARED_DIR) {
            withContext(dispatcherProvider.io) {
                directory(context, dirName).deleteAllFilesInDirectory()
            }
        }
    }
}
